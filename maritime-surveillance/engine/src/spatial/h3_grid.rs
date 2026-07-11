use anyhow::Result;
use h3o::{LatLng, Resolution};

pub struct H3Grid {
    resolution: Resolution,
}

impl H3Grid {
    pub fn new(resolution: u8) -> Result<Self> {
        let resolution = Resolution::try_from(resolution)?;

        Ok(Self { resolution })
    }

    pub fn latlon_to_cell(&self, lat: f64, lon: f64) -> Result<u64> {
        let coord = LatLng::new(lat, lon)?;

        let cell = coord.to_cell(self.resolution);

        Ok(u64::from(cell))
    }
}