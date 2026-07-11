use anyhow::Result;

use super::bitmap::SpatialBitmap;
use super::h3_grid::H3Grid;

pub struct GeofenceEngine {
    grid: H3Grid,
    bitmap: SpatialBitmap,
}

impl GeofenceEngine {
    pub fn new(resolution: u8) -> Result<Self> {
        Ok(Self {
            grid: H3Grid::new(resolution)?,
            bitmap: SpatialBitmap::new(),
        })
    }

    pub fn load_demo_zone(&mut self) -> Result<()> {
    let demo_points = [
        (19.0760, 72.8777), // Mumbai
        (13.0827, 80.2707), // Chennai
        (9.9312, 76.2673),  // Kochi
        (15.2993, 74.1240), // Goa
        (22.5726, 88.3639), // Kolkata
        (8.4811, 76.9500),  // Vizhinjam
    ];

    for (lat, lon) in demo_points {
        self.add_zone(lat, lon)?;
    }

    Ok(())
}

    pub fn add_zone(&mut self, lat: f64, lon: f64) -> Result<()> {
        let cell = self.grid.latlon_to_cell(lat, lon)?;

        self.bitmap.insert(cell);

        Ok(())
    }

    pub fn contains(&self, lat: f64, lon: f64) -> Result<bool> {
        let cell = self.grid.latlon_to_cell(lat, lon)?;

        Ok(self.bitmap.contains(cell))
    }
}