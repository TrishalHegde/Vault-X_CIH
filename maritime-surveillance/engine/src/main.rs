mod alerts;
mod config;
mod detection;
mod models;
mod processor;
mod queue;
mod spatial;
mod state;
mod storage;
mod udp;
mod utils;
mod ws;

use std::sync::Arc;

use config::settings::Settings;
use processor::pipeline::ProcessingPipeline;
use state::SharedState;
use storage::postgres::PostgresWriter;
use udp::receiver::UdpReceiver;
use utils::logger::init_logger;
use ws::server::start_ws_server;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_logger();

    let settings = Settings::new();

    log::info!("==================================");
    log::info!("Maritime Surveillance Engine");
    log::info!("  UDP port  : {}", settings.udp_port);
    log::info!("  WS  port  : {}", settings.ws_port);
    log::info!("  Workers   : {}", settings.worker_threads);
    log::info!("  H3 res    : {}", settings.h3_resolution);
    log::info!("==================================");

    let shared_state = Arc::new(SharedState::new());

    let pipeline = ProcessingPipeline::new(
        settings.buffer_size,
        settings.buffer_size,
        settings.h3_resolution,
        shared_state.clone(),
    )?;

    pipeline.start_workers(settings.worker_threads);

    let connection_string = format!(
        "host={} port={} user={} password={} dbname={}",
        settings.database_host, settings.database_port,
        settings.database_user, settings.database_password,
        settings.database_name
    );

    let alert_receiver = pipeline.alert_receiver();

    match PostgresWriter::new(&connection_string).await {
        Ok(db) => {
            log::info!("PostgreSQL connected — alerts will be persisted.");
            tokio::spawn(async move {
                while let Ok(alert) = alert_receiver.recv() {
                    if let Err(e) = db.insert_alert(&alert).await {
                        log::error!("DB insert failed: {}", e);
                    }
                }
            });
        }
        Err(e) => {
            log::warn!("PostgreSQL unavailable ({}) — running without persistence.", e);
            tokio::spawn(async move {
                while let Ok(alert) = alert_receiver.recv() {
                    log::debug!("Alert (no DB): mmsi={} severity={:?}", alert.mmsi, alert.severity);
                }
            });
        }
    }

    // Start WebSocket + REST server (passes udp_port for internal stress test)
    let ws_state = shared_state.clone();
    let ws_port = settings.ws_port;
    let udp_port = settings.udp_port;
    tokio::spawn(async move {
        if let Err(e) = start_ws_server(ws_port, udp_port, ws_state).await {
            log::error!("WebSocket server error: {}", e);
        }
    });

    // Start UDP receiver (blocks main task)
    let receiver = UdpReceiver::new(&settings.udp_host, settings.udp_port).await?;
    log::info!("All systems online — waiting for telemetry on UDP:{}", settings.udp_port);

    receiver.start(pipeline.telemetry_sender()).await?;
    Ok(())
}