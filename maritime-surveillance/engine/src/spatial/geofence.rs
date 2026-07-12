use anyhow::Result;

use super::bitmap::SpatialBitmap;
use super::h3_grid::H3Grid;

/// Name of a restricted zone for alert annotation
#[allow(dead_code)]
pub struct RestrictedZoneEntry {
    pub lat: f64,
    pub lon: f64,
    pub name: &'static str,
}

pub struct GeofenceEngine {
    grid: H3Grid,
    bitmap: SpatialBitmap,
}

/// Real Indian Ocean Marine Protected Areas and Restricted Zones.
/// Each point marks the zone center — the H3 cell at resolution 7 covers
/// ~5.16 km² which is appropriate for port approaches and MPA boundaries.
const INDIAN_RESTRICTED_ZONES: &[RestrictedZoneEntry] = &[
    RestrictedZoneEntry { lat: 19.3600, lon: 71.3000, name: "Bombay High Offshore Oil Field" },
    RestrictedZoneEntry { lat: 22.5000, lon: 69.4400, name: "Gulf of Kutch Marine National Park" },
    RestrictedZoneEntry { lat: 10.8000, lon: 72.3000, name: "Lakshadweep Sensitive Coral Buffer" },
    RestrictedZoneEntry { lat: 13.9000, lon: 81.3000, name: "Sriharikota Launch Trajectory Exclusion Zone" },
    RestrictedZoneEntry { lat: 20.6700, lon: 86.9100, name: "Gahirmatha Marine Sanctuary" },
    RestrictedZoneEntry { lat: 21.6200, lon: 88.4000, name: "Sundarbans Coastal Buffer" },
    RestrictedZoneEntry { lat: 11.5800, lon: 92.5800, name: "Mahatma Gandhi Marine National Park (Wandoor)" },
    RestrictedZoneEntry { lat: 9.7800, lon: 79.3200, name: "Palk Strait IMBL Buffer (Grey Zone)" },
    RestrictedZoneEntry { lat: 3.6000, lon: 99.6000, name: "Strait of Malacca Transit Corridor" },
];

impl GeofenceEngine {
    pub fn new(resolution: u8) -> Result<Self> {
        Ok(Self {
            grid: H3Grid::new(resolution)?,
            bitmap: SpatialBitmap::new(),
        })
    }

    /// Load all real Indian Ocean restricted zones into the H3 bitmap.
    pub fn load_demo_zone(&mut self) -> Result<()> {
        let mut count = 0;
        for zone in INDIAN_RESTRICTED_ZONES {
            self.add_zone(zone.lat, zone.lon)?;
            count += 1;
        }
        log::info!(
            "Loaded {} Indian maritime restricted zones into H3 Roaring Bitmap",
            count
        );
        Ok(())
    }

    pub fn add_zone(&mut self, lat: f64, lon: f64) -> Result<()> {
        let cell: u64 = self.grid.latlon_to_cell(lat, lon)?;
        self.bitmap.insert(cell);
        Ok(())
    }

    pub fn contains(&self, lat: f64, lon: f64) -> Result<bool> {
        let cell: u64 = self.grid.latlon_to_cell(lat, lon)?;
        Ok(self.bitmap.contains(cell))
    }

    /// Returns count of loaded zone cells
    #[allow(dead_code)]
    pub fn zone_count(&self) -> usize {
        INDIAN_RESTRICTED_ZONES.len()
    }
}