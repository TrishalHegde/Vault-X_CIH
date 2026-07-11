#[derive(Debug, Clone)]
pub struct RestrictedZone {
    /// Unique identifier
    pub id: String,

    /// Human-readable name
    pub name: String,

    /// All H3 cells belonging to this zone
    pub h3_cells: Vec<u64>,
}

impl RestrictedZone {
    pub fn new(id: String, name: String, h3_cells: Vec<u64>) -> Self {
        Self {
            id,
            name,
            h3_cells,
        }
    }
}