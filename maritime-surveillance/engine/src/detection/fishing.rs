use chrono::Utc;
use uuid::Uuid;

use crate::models::vessel::Vessel;
use crate::state::AlertEntry;

/// Trawling speed range in knots — fishing nets are dragged at low speeds
const TRAWLING_SPEED_MIN: f64 = 1.5;
const TRAWLING_SPEED_MAX: f64 = 5.0;

/// Speed below which AIS dark / stationary is suspected
const STATIONARY_THRESHOLD: f64 = 0.3;

/// Speed above which an AIS-off maneuver is suspicious (was moving, now stopped)
const MOVING_THRESHOLD: f64 = 3.0;

/// If multiple fishing vessels are within proximity (same H3 cell), flag rendezvous
#[allow(dead_code)]
pub const RENDEZVOUS_MIN_VESSELS: usize = 3;

/// Illegal fishing detection rules, applied per vessel per message
pub struct FishingDetector;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct FishingAlert {
    pub entry: AlertEntry,
    pub detection_rule: FishingRule,
}

#[derive(Debug, Clone, PartialEq)]
#[allow(dead_code)]
pub enum FishingRule {
    MpaBreach,
    SuspectedTrawling,
    AisDarkSuspected,
    FleetRendezvous,
    HighSpeedInEcologicalZone,
}

impl FishingDetector {
    /// Check a fishing vessel inside a restricted zone for specific fishing violations.
    /// `prev_speed` is the last recorded speed for this MMSI (None if first observation).
    pub fn check_in_zone(
        vessel: &Vessel,
        zone_name: &str,
        prev_speed: Option<f64>,
    ) -> Vec<FishingAlert> {
        let mut alerts = Vec::new();
        let is_fishing = vessel.vessel_type.as_str() == "fishing";

        // ── Rule 1: Any fishing vessel inside an MPA is a violation ─────────
        if is_fishing {
            alerts.push(FishingAlert {
                detection_rule: FishingRule::MpaBreach,
                entry: AlertEntry {
                    id: Uuid::new_v4().to_string(),
                    vessel_id: vessel.mmsi.to_string(),
                    vessel_name: vessel.name.clone(),
                    alert_type: "Illegal Fishing — MPA Breach".to_string(),
                    severity: "CRITICAL".to_string(),
                    location: format!("{:.4}, {:.4}", vessel.latitude, vessel.longitude),
                    status: "ACTIVE".to_string(),
                    timestamp: Utc::now().to_rfc3339(),
                    zone: zone_name.to_string(),
                    detection_detail: format!(
                        "Fishing vessel in {} at {:.1} kn",
                        zone_name, vessel.speed
                    ),
                },
            });
        }

        // ── Rule 2: Trawling speed (1.5–5 kn) while in protected zone ──────
        if is_fishing
            && vessel.speed >= TRAWLING_SPEED_MIN
            && vessel.speed <= TRAWLING_SPEED_MAX
        {
            alerts.push(FishingAlert {
                detection_rule: FishingRule::SuspectedTrawling,
                entry: AlertEntry {
                    id: Uuid::new_v4().to_string(),
                    vessel_id: vessel.mmsi.to_string(),
                    vessel_name: vessel.name.clone(),
                    alert_type: "Suspected Trawling".to_string(),
                    severity: "CRITICAL".to_string(),
                    location: format!("{:.4}, {:.4}", vessel.latitude, vessel.longitude),
                    status: "ACTIVE".to_string(),
                    timestamp: Utc::now().to_rfc3339(),
                    zone: zone_name.to_string(),
                    detection_detail: format!(
                        "Trawling speed {:.1} kn inside {} — nets likely deployed",
                        vessel.speed, zone_name
                    ),
                },
            });
        }

        // ── Rule 3: AIS dark — vessel was moving, now near-stationary ───────
        if let Some(prev) = prev_speed {
            if prev >= MOVING_THRESHOLD && vessel.speed <= STATIONARY_THRESHOLD {
                alerts.push(FishingAlert {
                    detection_rule: FishingRule::AisDarkSuspected,
                    entry: AlertEntry {
                        id: Uuid::new_v4().to_string(),
                        vessel_id: vessel.mmsi.to_string(),
                        vessel_name: vessel.name.clone(),
                        alert_type: "AIS Manipulation Suspected".to_string(),
                        severity: "HIGH".to_string(),
                        location: format!("{:.4}, {:.4}", vessel.latitude, vessel.longitude),
                        status: "ACTIVE".to_string(),
                        timestamp: Utc::now().to_rfc3339(),
                        zone: zone_name.to_string(),
                        detection_detail: format!(
                            "Was {:.1} kn, now {:.1} kn — possible AIS transponder shutdown",
                            prev, vessel.speed
                        ),
                    },
                });
            }
        }

        // ── Rule 4: Any non-fishing vessel at very high speed in eco zone ────
        if !is_fishing && vessel.speed > 18.0 {
            alerts.push(FishingAlert {
                detection_rule: FishingRule::HighSpeedInEcologicalZone,
                entry: AlertEntry {
                    id: Uuid::new_v4().to_string(),
                    vessel_id: vessel.mmsi.to_string(),
                    vessel_name: vessel.name.clone(),
                    alert_type: "Speed Violation — Ecological Zone".to_string(),
                    severity: "HIGH".to_string(),
                    location: format!("{:.4}, {:.4}", vessel.latitude, vessel.longitude),
                    status: "ACTIVE".to_string(),
                    timestamp: Utc::now().to_rfc3339(),
                    zone: zone_name.to_string(),
                    detection_detail: format!(
                        "{:.1} kn exceeds max speed in {}", vessel.speed, zone_name
                    ),
                },
            });
        }

        alerts
    }

    /// Check a fishing vessel rendezvous — called from engine state snapshot.
    /// `co_located_count` = number of other fishing vessels in the same H3 cell.
    pub fn check_fleet_rendezvous(
        vessel: &Vessel,
        co_located_count: usize,
    ) -> Option<FishingAlert> {
        if vessel.vessel_type.as_str() == "fishing"
            && co_located_count >= RENDEZVOUS_MIN_VESSELS
        {
            Some(FishingAlert {
                detection_rule: FishingRule::FleetRendezvous,
                entry: AlertEntry {
                    id: Uuid::new_v4().to_string(),
                    vessel_id: vessel.mmsi.to_string(),
                    vessel_name: vessel.name.clone(),
                    alert_type: "Fishing Fleet Rendezvous".to_string(),
                    severity: "HIGH".to_string(),
                    location: format!("{:.4}, {:.4}", vessel.latitude, vessel.longitude),
                    status: "ACTIVE".to_string(),
                    timestamp: Utc::now().to_rfc3339(),
                    zone: "Open Water".to_string(),
                    detection_detail: format!(
                        "{} fishing vessels detected in same grid cell — coordinated illegal fishing suspected",
                        co_located_count + 1
                    ),
                },
            })
        } else {
            None
        }
    }
}
