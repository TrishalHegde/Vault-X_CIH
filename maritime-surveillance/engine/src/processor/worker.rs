use std::sync::Arc;

use chrono::Utc;
use crossbeam_channel::{Receiver, Sender};

use crate::{
    alerts::detector::AlertDetector,
    models::{
        alert::Alert,
        packet::TelemetryPacket,
        vessel::Vessel,
    },
    spatial::geofence::GeofenceEngine,
};

pub struct Worker {
    receiver: Receiver<TelemetryPacket>,
    alert_sender: Sender<Alert>,
    geofence: Arc<GeofenceEngine>,
}

impl Worker {
    pub fn new(
        receiver: Receiver<TelemetryPacket>,
        alert_sender: Sender<Alert>,
        geofence: Arc<GeofenceEngine>,
    ) -> Self {
        Self {
            receiver,
            alert_sender,
            geofence,
        }
    }

    pub fn start(self) {
        std::thread::spawn(move || {

            log::info!("Worker started.");

            while let Ok(packet) = self.receiver.recv() {

    let vessel = Vessel {
        mmsi: packet.mmsi,
        latitude: packet.lat,
        longitude: packet.lon,
        speed: packet.speed,
        course: Some(packet.course),
        heading: Some(packet.heading),
        timestamp: packet.timestamp.unwrap_or_else(chrono::Utc::now),
    };

    if self
        .geofence
        .contains(vessel.latitude, vessel.longitude)
        .unwrap_or(false)
    {
        let alert = AlertDetector::detect(&vessel, "DEMO_ZONE");

        println!(
            "\n🚨 ALERT | MMSI={} | LAT={:.4} | LON={:.4}",
            alert.mmsi,
            alert.latitude,
            alert.longitude
        );

        if self.alert_sender.send(alert).is_err() {
            log::error!("Alert queue disconnected.");
        }
    }
}
        });
    }
}