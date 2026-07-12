use chrono::Utc;
use uuid::Uuid;

use crate::models::alert::{Alert, AlertSeverity};
use crate::models::vessel::Vessel;

pub struct AlertDetector;

impl AlertDetector {
    pub fn detect(vessel: &Vessel, zone_id: &str) -> Alert {
        let severity = Self::calculate_severity(vessel.speed);
        let alert_type = Self::alert_type(vessel.speed);

        Alert {
            id: Uuid::new_v4(),
            mmsi: vessel.mmsi,
            vessel_name: vessel.name.clone(),
            vessel_type: vessel.vessel_type.as_str().to_string(),
            latitude: vessel.latitude,
            longitude: vessel.longitude,
            speed: vessel.speed,
            zone_id: zone_id.to_string(),
            alert_type,
            severity,
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

    fn alert_type(speed: f64) -> String {
        if speed >= 15.0 {
            "Speed Violation".to_string()
        } else if speed < 3.0 {
            "Stationary Vessel".to_string()
        } else {
            "Restricted Zone Entry".to_string()
        }
    }
}