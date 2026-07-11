use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vessel {
    pub mmsi: u64,

    pub latitude: f64,

    pub longitude: f64,

    pub speed: f64,

    pub course: Option<f64>,

    pub heading: Option<f64>,

    pub timestamp: DateTime<Utc>,
}