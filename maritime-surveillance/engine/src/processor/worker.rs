use std::sync::Arc;

use chrono::Utc;
use crossbeam_channel::{Receiver, Sender};

use crate::{
    alerts::detector::AlertDetector,
    detection::fishing::FishingDetector,
    models::{
        alert::Alert,
        packet::TelemetryPacket,
        vessel::{Vessel, VesselType},
    },
    spatial::geofence::GeofenceEngine,
    state::{AlertEntry, SharedState, VesselEntry},
};

// Zone names — synced with restricted_zones.json GeoJSON
const MARINE_ZONE_NAMES: &[(&str, f64, f64, f64)] = &[
    // (zone_name, lat_center, lon_center, radius_deg)
    ("Bombay High Offshore Oil Field",                   19.36, 71.30, 0.3),
    ("Gulf of Kutch Marine National Park",               22.50, 69.44, 0.4),
    ("Lakshadweep Sensitive Coral Buffer",               10.80, 72.30, 1.0),
    ("Sriharikota Launch Trajectory Exclusion Zone",     13.90, 81.30, 1.0),
    ("Gahirmatha Marine Sanctuary",                      20.67, 86.91, 0.3),
    ("Sundarbans Coastal Buffer",                        21.62, 88.40, 0.5),
    ("Mahatma Gandhi Marine National Park (Wandoor)",    11.58, 92.58, 0.2),
    ("Palk Strait IMBL Buffer (Grey Zone)",               9.78, 79.32, 0.5),
    ("Strait of Malacca Transit Corridor",                3.60, 99.60, 2.0),
];

fn nearest_zone_name(lat: f64, lon: f64) -> &'static str {
    let mut nearest = "Restricted Zone";
    let mut min_dist = f64::MAX;
    for (name, z_lat, z_lon, _) in MARINE_ZONE_NAMES {
        let d = (lat - z_lat).powi(2) + (lon - z_lon).powi(2);
        if d < min_dist {
            min_dist = d;
            nearest = name;
        }
    }
    nearest
}

pub struct Worker {
    receiver: Receiver<TelemetryPacket>,
    alert_sender: Sender<Alert>,
    geofence: Arc<GeofenceEngine>,
    state: Arc<SharedState>,
}

impl Worker {
    pub fn new(
        receiver: Receiver<TelemetryPacket>,
        alert_sender: Sender<Alert>,
        geofence: Arc<GeofenceEngine>,
        state: Arc<SharedState>,
    ) -> Self {
        Self { receiver, alert_sender, geofence, state }
    }

    pub fn start(self) {
        std::thread::spawn(move || {
            log::info!("Worker started.");

            while let Ok(packet) = self.receiver.recv() {
                let vessel_type = VesselType::from_mmsi(packet.mmsi);
                let vessel_name = VesselType::generate_name(packet.mmsi);

                // Get previous speed for AIS-dark detection
                let prev_speed = self.state
                    .vessels
                    .get(&packet.mmsi)
                    .map(|e| e.speed);

                let vessel = Vessel {
                    mmsi: packet.mmsi,
                    name: vessel_name.clone(),
                    vessel_type: vessel_type.clone(),
                    latitude: packet.lat,
                    longitude: packet.lon,
                    speed: packet.speed,
                    course: Some(packet.course),
                    heading: Some(packet.heading),
                    timestamp: packet.timestamp.unwrap_or_else(Utc::now),
                };

                let in_zone = self.geofence
                    .contains(vessel.latitude, vessel.longitude)
                    .unwrap_or(false);

                let (risk, risk_score) = if in_zone {
                    let zone_name = nearest_zone_name(vessel.latitude, vessel.longitude);

                    // --- Standard geofence alert ---
                    let alert = AlertDetector::detect(&vessel, zone_name);
                    let risk = alert.severity.as_risk_str().to_string();
                    let score = alert.severity.as_risk_score();
                    let severity_str = alert.severity.as_frontend_str().to_string();

                    let base_alert = AlertEntry {
                        id: alert.id.to_string(),
                        vessel_id: packet.mmsi.to_string(),
                        vessel_name: vessel_name.clone(),
                        alert_type: alert.alert_type.clone(),
                        severity: severity_str,
                        location: format!("{:.4}, {:.4}", vessel.latitude, vessel.longitude),
                        status: "ACTIVE".to_string(),
                        timestamp: alert.timestamp.to_rfc3339(),
                        zone: zone_name.to_string(),
                        detection_detail: format!(
                            "Vessel entered restricted zone at {:.1} kn",
                            vessel.speed
                        ),
                    };
                    self.state.alerts.insert(base_alert.id.clone(), base_alert);

                    // --- Fishing-specific detection ---
                    let fishing_alerts = FishingDetector::check_in_zone(
                        &vessel,
                        zone_name,
                        prev_speed,
                    );
                    for fa in fishing_alerts {
                        self.state.alerts.insert(fa.entry.id.clone(), fa.entry);
                    }

                    if self.alert_sender.send(alert).is_err() {
                        log::error!("Alert queue disconnected.");
                    }

                    (risk, score)
                } else {
                    // AIS-dark check even outside restricted zones
                    if let Some(prev) = prev_speed {
                        if prev >= 3.0 && vessel.speed <= 0.3
                            && vessel.vessel_type.as_str() == "fishing"
                        {
                            let dark_alert = AlertEntry {
                                id: uuid::Uuid::new_v4().to_string(),
                                vessel_id: packet.mmsi.to_string(),
                                vessel_name: vessel_name.clone(),
                                alert_type: "AIS Manipulation Suspected".to_string(),
                                severity: "HIGH".to_string(),
                                location: format!("{:.4}, {:.4}", vessel.latitude, vessel.longitude),
                                status: "ACTIVE".to_string(),
                                timestamp: Utc::now().to_rfc3339(),
                                zone: "Open Water".to_string(),
                                detection_detail: format!(
                                    "Fishing vessel was {:.1} kn, now stopped — possible AIS shutdown",
                                    prev
                                ),
                            };
                            self.state.alerts.insert(dark_alert.id.clone(), dark_alert);
                        }
                    }

                    let (r, s) = if vessel.speed < 3.0 { ("low", 10u32) }
                        else if vessel.speed < 10.0 { ("medium", 35) }
                        else if vessel.speed < 18.0 { ("high", 65) }
                        else { ("critical", 90) };
                    (r.to_string(), s)
                };

                // Update live vessel state
                let entry = VesselEntry {
                    id: packet.mmsi.to_string(),
                    mmsi: packet.mmsi.to_string(),
                    name: vessel_name,
                    vessel_type: vessel_type.as_str().to_string(),
                    lat: packet.lat,
                    lng: packet.lon,
                    heading: packet.heading,
                    speed: packet.speed,
                    risk,
                    risk_score,
                };
                self.state.vessels.insert(packet.mmsi, entry);
                self.state.increment_msg();
            }
        });
    }
}