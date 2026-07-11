use chrono::Utc;
use uuid::Uuid;

use crate::models::alert::{Alert, AlertSeverity};
use crate::models::vessel::Vessel;

pub struct AlertDetector;

impl AlertDetector {
    pub fn detect(vessel: &Vessel, zone_id: &str) -> Alert {
        Alert {
            id: Uuid::new_v4(),
            mmsi: vessel.mmsi.clone(),
            latitude: vessel.latitude,
            longitude: vessel.longitude,
            speed: vessel.speed,
            zone_id: zone_id.to_string(),
            severity: Self::calculate_severity(vessel.speed),
            timestamp: Utc::now(),
        }
    }

    fn calculate_severity(speed: f64) -> AlertSeverity {
        if speed < 3.0 {
            AlertSeverity::Low
        } else if speed < 8.0 {
            AlertSeverity::Medium
        } else if speed < 15.0 {
            AlertSeverity::High
        } else {
            AlertSeverity::Critical
        }
    }
}