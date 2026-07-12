use std::net::SocketAddr;
use std::sync::Arc;
use std::sync::atomic::Ordering;
use std::time::Duration;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use tokio::sync::broadcast;
use tokio::time;

use crate::state::{AlertEntry, EngineUpdate, SharedState};

/// App state for axum handlers
#[derive(Clone)]
pub struct AppState {
    pub shared: Arc<SharedState>,
    pub broadcast_tx: broadcast::Sender<String>,
    pub udp_port: u16,
}

/// Start the axum WebSocket + REST server.
pub async fn start_ws_server(
    port: u16,
    udp_port: u16,
    shared: Arc<SharedState>,
) -> anyhow::Result<()> {
    let (tx, _rx) = broadcast::channel::<String>(256);
    let tx_clone = tx.clone();
    let shared_broadcast = shared.clone();

    // Periodic broadcast task — fires every 1 second
    tokio::spawn(async move {
        let mut interval = time::interval(Duration::from_secs(1));
        let mut prev_msg_count: u64 = 0;
        let mut tick_count: u64 = 0;

        loop {
            interval.tick().await;
            tick_count += 1;

            // Compute msg/sec
            let current = shared_broadcast.msg_processed.load(Ordering::Relaxed);
            let per_sec = current.saturating_sub(prev_msg_count);
            shared_broadcast.msg_per_sec.store(per_sec, Ordering::Relaxed);
            prev_msg_count = current;

            let vessels: Vec<_> = shared_broadcast.vessels.iter()
                .map(|e| e.value().clone()).collect();

            let mut all_alerts: Vec<AlertEntry> = shared_broadcast.alerts.iter()
                .map(|e| e.value().clone()).collect();
            all_alerts.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
            all_alerts.truncate(100);

            // Separate fishing alerts for dedicated frontend tab
            let fishing_alerts: Vec<AlertEntry> = all_alerts.iter()
                .filter(|a| {
                    let t = &a.alert_type;
                    t.contains("Fishing") || t.contains("Trawling") || t.contains("AIS")
                        || t.contains("Fleet")
                })
                .cloned()
                .collect();

            let stats = shared_broadcast.snapshot_stats();

            let update = EngineUpdate {
                msg_type: "engine_update".to_string(),
                vessels,
                alerts: all_alerts,
                fishing_alerts,
                stats,
                restricted_cells: vec![],
            };

            if let Ok(payload) = serde_json::to_string(&update) {
                let _ = tx_clone.send(payload);
            }

            // Auto-expire alerts older than 45 seconds
            if tick_count % 5 == 0 {
                let now = chrono::Utc::now();
                shared_broadcast.alerts.retain(|_, alert| {
                    if let Ok(ts) = chrono::DateTime::parse_from_rfc3339(&alert.timestamp) {
                        now.signed_duration_since(ts.with_timezone(&chrono::Utc))
                            .num_seconds() < 45
                    } else {
                        true
                    }
                });
            }
        }
    });

    let app_state = AppState {
        shared,
        broadcast_tx: tx,
        udp_port,
    };

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/health", get(health_handler))
        // Simulation triggers
        .route("/api/simulation/dark-fleet", post(trigger_dark_fleet))
        .route("/api/simulation/force-stop", post(trigger_stationary))
        .route("/api/simulation/rapid-heading", post(trigger_redirection))
        .route("/api/simulation/rendezvous", post(trigger_rendezvous))
        // Stress test
        .route("/api/stress/start", post(stress_start))
        .route("/api/stress/stop", post(stress_stop))
        .route("/api/stress/status", get(stress_status))
        .with_state(app_state)
        .layer(tower_http_cors());

    let addr = format!("0.0.0.0:{}", port);
    log::info!("WebSocket server listening on ws://{}/ws", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

fn tower_http_cors() -> tower_http::cors::CorsLayer {
    use tower_http::cors::{Any, CorsLayer};
    CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any)
}

async fn health_handler() -> impl IntoResponse {
    axum::Json(json!({"status": "ok", "service": "maritime-engine"}))
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.broadcast_tx.subscribe();

    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    while let Some(Ok(_)) = receiver.next().await {}
    send_task.abort();
}

// ─── Stress Test Endpoints ───────────────────────────────────────────────────

async fn stress_start(State(state): State<AppState>) -> impl IntoResponse {
    use std::sync::atomic::Ordering;

    if state.shared.stress_running.load(Ordering::Relaxed) {
        return axum::Json(json!({"status": "already_running"}));
    }

    state.shared.stress_running.store(true, Ordering::Relaxed);
    state.shared.stress_sent.store(0, Ordering::Relaxed);

    let udp_port = state.udp_port;
    let stress_running = state.shared.stress_running.clone();
    let stress_sent = state.shared.stress_sent.clone();

    // Spawn 8 concurrent UDP blaster tasks
    for task_id in 0u64..8 {
        let running = stress_running.clone();
        let sent = stress_sent.clone();

        tokio::spawn(async move {
            let sock = match tokio::net::UdpSocket::bind("0.0.0.0:0").await {
                Ok(s) => s,
                Err(e) => {
                    log::error!("Stress task {} bind failed: {}", task_id, e);
                    return;
                }
            };
            let target: SocketAddr = format!("127.0.0.1:{}", udp_port).parse().unwrap();

            let mut mmsi_base: u64 = 500_000_000 + task_id * 10_000;
            let vessel_count: u64 = 700;

            // Indian Ocean coordinate ranges for stress test vessels
            let lat_range = (5.0f64, 24.5f64);
            let lon_range = (67.0f64, 97.5f64);

            // Pre-build packets to avoid allocation in the hot loop
            let mut packets: Vec<Vec<u8>> = (0..vessel_count)
                .map(|i| {
                    let lat = lat_range.0 + (i as f64 / vessel_count as f64)
                        * (lat_range.1 - lat_range.0);
                    let lon = lon_range.0 + (task_id as f64 / 8.0)
                        * (lon_range.1 - lon_range.0);
                    let pkt = json!({
                        "mmsi": mmsi_base + i,
                        "lat": lat,
                        "lon": lon,
                        "speed": 10.0 + (i % 20) as f64 * 0.5,
                        "course": (i * 5 % 360) as f64,
                        "heading": (i * 5 % 360) as f64,
                    });
                    serde_json::to_vec(&pkt).unwrap()
                })
                .collect();

            let mut tick: u64 = 0;
            while running.load(Ordering::Relaxed) {
                for pkt in &packets {
                    let _ = sock.send_to(pkt, target).await;
                }
                sent.fetch_add(vessel_count, Ordering::Relaxed);
                tick += 1;

                // Small yield every 10 iterations to avoid starving tokio runtime
                if tick % 10 == 0 {
                    tokio::task::yield_now().await;
                }

                // Slightly vary lat/lon every 100 ticks
                if tick % 100 == 0 {
                    mmsi_base = mmsi_base.wrapping_add(1);
                    packets = (0..vessel_count)
                        .map(|i| {
                            let lat = lat_range.0
                                + ((i + tick) as f64 / vessel_count as f64)
                                    * (lat_range.1 - lat_range.0);
                            let lon = lon_range.0
                                + (task_id as f64 / 8.0) * (lon_range.1 - lon_range.0)
                                + (tick as f64 * 0.001) % 5.0;
                            let pkt = json!({
                                "mmsi": mmsi_base + i,
                                "lat": lat,
                                "lon": lon,
                                "speed": 8.0 + (i % 15) as f64,
                                "course": (i * 7 % 360) as f64,
                                "heading": (i * 7 % 360) as f64,
                            });
                            serde_json::to_vec(&pkt).unwrap()
                        })
                        .collect();
                }
            }

            log::info!("Stress task {} stopped.", task_id);
        });
    }

    log::info!("Stress test STARTED — 8 tasks × 700 vessels targeting UDP:{}", udp_port);
    axum::Json(json!({"status": "started", "tasks": 8, "vessels_per_task": 700}))
}

async fn stress_stop(State(state): State<AppState>) -> impl IntoResponse {
    state.shared.stress_running.store(false, Ordering::Relaxed);
    let total_sent = state.shared.stress_sent.load(Ordering::Relaxed);
    log::info!("Stress test STOPPED — total sent: {}", total_sent);
    axum::Json(json!({"status": "stopped", "total_sent": total_sent}))
}

async fn stress_status(State(state): State<AppState>) -> impl IntoResponse {
    let running = state.shared.stress_running.load(Ordering::Relaxed);
    let total_sent = state.shared.stress_sent.load(Ordering::Relaxed);
    let msg_per_sec = state.shared.msg_per_sec.load(Ordering::Relaxed);
    axum::Json(json!({
        "running": running,
        "total_sent": total_sent,
        "msg_per_sec": msg_per_sec,
        "target_msg_per_sec": 50000
    }))
}

// ─── Simulation Trigger Handlers ─────────────────────────────────────────────

async fn trigger_dark_fleet(State(state): State<AppState>) -> impl IntoResponse {
    if let Some(entry) = state.shared.vessels.iter().find(|e| e.value().vessel_type == "cargo") {
        let v = entry.value().clone();
        let alert = AlertEntry {
            id: uuid::Uuid::new_v4().to_string(),
            vessel_id: v.id.clone(),
            vessel_name: v.name.clone(),
            alert_type: "Dark Fleet".to_string(),
            severity: "CRITICAL".to_string(),
            location: format!("{:.4}, {:.4}", v.lat, v.lng),
            status: "ACTIVE".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            zone: "Open Water".to_string(),
            detection_detail: "Vessel transmitting on dark AIS frequency — identity masked".to_string(),
        };
        state.shared.alerts.insert(alert.id.clone(), alert);
    }
    axum::Json(json!({"status": "triggered", "event": "dark-fleet"}))
}

async fn trigger_stationary(State(state): State<AppState>) -> impl IntoResponse {
    if let Some(entry) = state.shared.vessels.iter().nth(1) {
        let v = entry.value().clone();
        let alert = AlertEntry {
            id: uuid::Uuid::new_v4().to_string(),
            vessel_id: v.id.clone(),
            vessel_name: v.name.clone(),
            alert_type: "Stationary Vessel".to_string(),
            severity: "WARNING".to_string(),
            location: format!("{:.4}, {:.4}", v.lat, v.lng),
            status: "ACTIVE".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            zone: "Open Water".to_string(),
            detection_detail: "Vessel stationary for >30 minutes — possible distress or illegal stop".to_string(),
        };
        state.shared.alerts.insert(alert.id.clone(), alert);
    }
    axum::Json(json!({"status": "triggered", "event": "force-stop"}))
}

async fn trigger_redirection(State(state): State<AppState>) -> impl IntoResponse {
    if let Some(entry) = state.shared.vessels.iter().nth(2) {
        let v = entry.value().clone();
        let alert = AlertEntry {
            id: uuid::Uuid::new_v4().to_string(),
            vessel_id: v.id.clone(),
            vessel_name: v.name.clone(),
            alert_type: "Rapid Heading Change".to_string(),
            severity: "HIGH".to_string(),
            location: format!("{:.4}, {:.4}", v.lat, v.lng),
            status: "ACTIVE".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            zone: "Open Water".to_string(),
            detection_detail: "Course changed >90° in <60s — evasion maneuver suspected".to_string(),
        };
        state.shared.alerts.insert(alert.id.clone(), alert);
    }
    axum::Json(json!({"status": "triggered", "event": "rapid-heading"}))
}

async fn trigger_rendezvous(State(state): State<AppState>) -> impl IntoResponse {
    let vessels: Vec<_> = state.shared.vessels.iter().take(2).map(|e| e.value().clone()).collect();
    if vessels.len() >= 2 {
        let v1 = &vessels[0];
        let v2 = &vessels[1];
        let alert = AlertEntry {
            id: uuid::Uuid::new_v4().to_string(),
            vessel_id: format!("{},{}", v1.id, v2.id),
            vessel_name: format!("{} + {}", v1.name, v2.name),
            alert_type: "Rendezvous".to_string(),
            severity: "HIGH".to_string(),
            location: format!("{:.4}, {:.4}", v1.lat, v1.lng),
            status: "ACTIVE".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            zone: "Open Water".to_string(),
            detection_detail: format!(
                "Vessels {} and {} within 0.5km — possible ship-to-ship transfer",
                v1.name, v2.name
            ),
        };
        state.shared.alerts.insert(alert.id.clone(), alert);
    }
    axum::Json(json!({"status": "triggered", "event": "rendezvous"}))
}
