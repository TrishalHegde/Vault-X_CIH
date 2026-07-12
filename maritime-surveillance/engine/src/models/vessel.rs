use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum VesselType {
    Cargo,
    Tanker,
    Passenger,
    Fishing,
    Patrol,
    Research,
    Tug,
    Military,
    Unknown,
}

impl VesselType {
    pub fn as_str(&self) -> &'static str {
        match self {
            VesselType::Cargo => "cargo",
            VesselType::Tanker => "tanker",
            VesselType::Passenger => "passenger",
            VesselType::Fishing => "fishing",
            VesselType::Patrol => "patrol",
            VesselType::Research => "research",
            VesselType::Tug => "tug",
            VesselType::Military => "military",
            VesselType::Unknown => "cargo",
        }
    }

    /// Deterministically assign a vessel type from mmsi
    pub fn from_mmsi(mmsi: u64) -> Self {
        let types = [
            VesselType::Cargo,
            VesselType::Tanker,
            VesselType::Passenger,
            VesselType::Fishing,
            VesselType::Patrol,
            VesselType::Research,
            VesselType::Tug,
            VesselType::Military,
        ];
        let idx = (mmsi % 8) as usize;
        types[idx].clone()
    }

    pub fn generate_name(mmsi: u64) -> String {
        let prefixes = [
            "MV", "MT", "SS", "RV", "INS", "FV", "COAST", "TS",
        ];
        let suffixes = [
            "PACIFIC", "ATLANTIC", "OCEAN", "STAR", "EAGLE",
            "HORIZON", "VOYAGER", "PIONEER", "GUARDIAN", "MARINER",
        ];
        let prefix_idx = (mmsi % 8) as usize;
        let suffix_idx = ((mmsi / 100) % 10) as usize;
        let num = mmsi % 1000;
        format!(
            "{} {} {}",
            prefixes[prefix_idx], suffixes[suffix_idx], num
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vessel {
    pub mmsi: u64,
    pub name: String,
    pub vessel_type: VesselType,
    pub latitude: f64,
    pub longitude: f64,
    pub speed: f64,
    pub course: Option<f64>,
    pub heading: Option<f64>,
    pub timestamp: DateTime<Utc>,
}