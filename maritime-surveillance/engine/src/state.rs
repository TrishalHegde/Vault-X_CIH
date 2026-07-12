use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

/// Per-vessel live state stored in the shared map
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VesselEntry {
    pub id: String,
    pub mmsi: String,
    pub name: String,
    #[serde(rename = "type")]
    pub vessel_type: String,
    pub lat: f64,
    pub lng: f64,
    pub heading: f64,
    pub speed: f64,
    pub risk: String,
    #[serde(rename = "riskScore")]
    pub risk_score: u32,
}

/// Per-alert state stored in the shared map
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertEntry {
    pub id: String,
    #[serde(rename = "vesselId")]
    pub vessel_id: String,
    #[serde(rename = "vesselName")]
    pub vessel_name: String,
    #[serde(rename = "type")]
    pub alert_type: String,
    pub severity: String,
    pub location: String,
    pub status: String,
    pub timestamp: String,
    /// Which restricted zone triggered the alert
    pub zone: String,
    /// Human-readable evidence string for display
    #[serde(rename = "detectionDetail")]
    pub detection_detail: String,
}

/// Shared engine stats
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EngineStats {
    #[serde(rename = "totalTracked")]
    pub total_tracked: u64,
    #[serde(rename = "msgProcessed")]
    pub msg_processed: u64,
    #[serde(rename = "activeThreats")]
    pub active_threats: u64,
    pub uptime: String,
    #[serde(rename = "msgPerSec")]
    pub msg_per_sec: u64,
    pub latency: f64,
    /// Whether stress test is currently active
    #[serde(rename = "stressRunning")]
    pub stress_running: bool,
    /// Fishing-specific alert count
    #[serde(rename = "fishingAlerts")]
    pub fishing_alerts: u64,
}

/// Top-level WS broadcast payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineUpdate {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub vessels: Vec<VesselEntry>,
    pub alerts: Vec<AlertEntry>,
    pub stats: EngineStats,
    #[serde(rename = "restrictedCells")]
    pub restricted_cells: Vec<String>,
    /// Only fishing-violation alerts
    #[serde(rename = "fishingAlerts")]
    pub fishing_alerts: Vec<AlertEntry>,
}

/// The shared state type alias
pub type VesselMap = Arc<DashMap<u64, VesselEntry>>;
pub type AlertMap = Arc<DashMap<String, AlertEntry>>;

pub struct SharedState {
    pub vessels: VesselMap,
    pub alerts: AlertMap,
    pub msg_processed: Arc<AtomicU64>,
    pub msg_per_sec: Arc<AtomicU64>,
    pub start_time: std::time::Instant,
    /// true while the stress test is running
    pub stress_running: Arc<AtomicBool>,
    /// total packets sent by the stress test
    pub stress_sent: Arc<AtomicU64>,
}

impl SharedState {
    pub fn new() -> Self {
        Self {
            vessels: Arc::new(DashMap::new()),
            alerts: Arc::new(DashMap::new()),
            msg_processed: Arc::new(AtomicU64::new(0)),
            msg_per_sec: Arc::new(AtomicU64::new(0)),
            start_time: std::time::Instant::now(),
            stress_running: Arc::new(AtomicBool::new(false)),
            stress_sent: Arc::new(AtomicU64::new(0)),
        }
    }

    pub fn uptime_string(&self) -> String {
        let elapsed = self.start_time.elapsed().as_secs();
        let hours = elapsed / 3600;
        let minutes = (elapsed % 3600) / 60;
        let seconds = elapsed % 60;
        if hours > 0 {
            format!("{}h {}m {}s", hours, minutes, seconds)
        } else {
            format!("{}m {}s", minutes, seconds)
        }
    }

    pub fn increment_msg(&self) {
        self.msg_processed.fetch_add(1, Ordering::Relaxed);
    }

    pub fn snapshot_stats(&self) -> EngineStats {
        let total_tracked = self.vessels.len() as u64;
        let active_threats = self.alerts.iter()
            .filter(|e| e.value().status == "ACTIVE")
            .count() as u64;
        let fishing_alerts = self.alerts.iter()
            .filter(|e| {
                let t = &e.value().alert_type;
                t.contains("Fishing") || t.contains("Trawling") || t.contains("AIS")
            })
            .count() as u64;
        EngineStats {
            total_tracked,
            msg_processed: self.msg_processed.load(Ordering::Relaxed),
            active_threats,
            uptime: self.uptime_string(),
            msg_per_sec: self.msg_per_sec.load(Ordering::Relaxed),
            latency: 1.2,
            stress_running: self.stress_running.load(Ordering::Relaxed),
            fishing_alerts,
        }
    }
}
