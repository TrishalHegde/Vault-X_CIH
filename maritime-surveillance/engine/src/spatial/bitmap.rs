use roaring::RoaringBitmap;

pub struct SpatialBitmap {
    bitmap: RoaringBitmap,
}

impl SpatialBitmap {
    pub fn new() -> Self {
        Self {
            bitmap: RoaringBitmap::new(),
        }
    }

    pub fn insert(&mut self, h3_cell: u64) {
        self.bitmap.insert((h3_cell % u32::MAX as u64) as u32);
    }

    pub fn contains(&self, h3_cell: u64) -> bool {
        self.bitmap
            .contains((h3_cell % u32::MAX as u64) as u32)
    }
}