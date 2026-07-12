use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub id: Uuid,
    pub mmsi: u64,
    pub vessel_name: String,
    pub vessel_type: String,
    pub latitude: f64,
    pub longitude: f64,
    pub speed: f64,
    pub zone_id: String,
    pub alert_type: String,
    pub severity: AlertSeverity,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AlertSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl AlertSeverity {
    pub fn as_frontend_str(&self) -> &'static str {
        match self {
            AlertSeverity::Low => "INFO",
            AlertSeverity::Medium => "WARNING",
            AlertSeverity::High => "HIGH",
            AlertSeverity::Critical => "CRITICAL",
        }
    }

    pub fn as_risk_str(&self) -> &'static str {
        match self {
            AlertSeverity::Low => "low",
            AlertSeverity::Medium => "medium",
            AlertSeverity::High => "high",
            AlertSeverity::Critical => "critical",
        }
    }

    pub fn as_risk_score(&self) -> u32 {
        match self {
            AlertSeverity::Low => 15,
            AlertSeverity::Medium => 45,
            AlertSeverity::High => 75,
            AlertSeverity::Critical => 95,
        }
    }
}