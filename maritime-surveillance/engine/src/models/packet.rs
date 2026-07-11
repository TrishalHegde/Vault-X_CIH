use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryPacket {
    pub mmsi: u64,

    pub lat: f64,

    pub lon: f64,

    pub speed: f64,

    pub course: f64,

    pub heading: f64,

    #[serde(default)]
    pub timestamp: Option<DateTime<Utc>>,
}