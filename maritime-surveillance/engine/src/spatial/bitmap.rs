use roaring::RoaringTreemap;

/// Wraps RoaringTreemap to provide true u64 H3 cell storage.
/// No hash collision risk — each 64-bit H3 cell index is stored exactly.
pub struct SpatialBitmap {
    bitmap: RoaringTreemap,
}

impl SpatialBitmap {
    pub fn new() -> Self {
        Self {
            bitmap: RoaringTreemap::new(),
        }
    }

    /// Insert a raw u64 H3 cell index
    pub fn insert(&mut self, h3_cell: u64) {
        self.bitmap.insert(h3_cell);
    }

    /// O(1) membership check against the full u64 cell space
    pub fn contains(&self, h3_cell: u64) -> bool {
        self.bitmap.contains(h3_cell)
    }

    pub fn len(&self) -> u64 {
        self.bitmap.len()
    }
}