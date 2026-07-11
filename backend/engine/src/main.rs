use geo::{Contains, Point, Polygon};
use geojson::{Geometry, Value};
use h3o::{LatLng, Resolution};
use postgres::{Client, NoTls};
use roaring::RoaringBitmap;
use rstar::{RTree, RTreeObject, AABB};
use serde::Deserialize;
use std::sync::Arc;
use std::thread;
use crossbeam::channel;
use tokio::net::UdpSocket;

#[derive(Deserialize, Debug, Clone)]
struct VesselTelemetry {
    mmsi: String,
    lat: f64,
    lon: f64,
    speed: f64,
}

#[derive(Debug, Clone)]
struct ZoneRule {
    max_speed_knots: Option<f64>,
}

#[derive(Clone)]
struct MarineZone {
    zone_id: String,
    polygon: Polygon<f64>,
    rule: ZoneRule,
}

// R-Tree integration for MarineZone
impl RTreeObject for MarineZone {
    type Envelope = AABB<[f64; 2]>;
    fn envelope(&self) -> Self::Envelope {
        use geo::BoundingRect;
        let bbox = self.polygon.bounding_rect().unwrap();
        AABB::from_corners(
            [bbox.min().x, bbox.min().y],
            [bbox.max().x, bbox.max().y],
        )
    }
}

// ---------------------------------------------------------
// Phase 1: Pre-Flight Configuration (The Cold Store Fetch)
// ---------------------------------------------------------
fn load_config_from_db() -> (RoaringBitmap, RTree<MarineZone>) {
    let mut db_client = Client::connect("host=localhost user=postgres password=hackathon dbname=postgres", NoTls)
        .expect("Failed to connect to database for startup config");

    let mut bitmap = RoaringBitmap::new();
    let mut zones = Vec::new();

    let rows = db_client.query("SELECT zone_id, rules, ST_AsGeoJSON(geom) FROM marine_zones", &[]).unwrap();
    for row in rows {
        let zone_id: String = row.get(0);
        let rules_val: serde_json::Value = row.get(1);
        let geom_json: String = row.get(2);

        // Parse Rules
        let max_speed = rules_val.get("max_speed_knots").and_then(|v| v.as_f64());
        let rule = ZoneRule { max_speed_knots: max_speed };

        // Parse Geometry
        let geo_val = geom_json.parse::<Geometry>().unwrap();
        if let Value::Polygon(poly_coords) = geo_val.value {
            // Convert to geo::Polygon
            let exterior: Vec<(f64, f64)> = poly_coords[0].iter().map(|c| (c[0], c[1])).collect();
            let polygon = Polygon::new(exterior.into(), vec![]);
            
            // For hackathon simplicity, we just hash the bounding box corners or centroid 
            // to populate the H3 Grid (Tier 1). In full production, we'd polyfill the whole polygon.
            use geo::Centroid;
            if let Some(centroid) = polygon.centroid() {
                if let Ok(coord) = LatLng::new(centroid.y(), centroid.x()) {
                    let cell = coord.to_cell(Resolution::Seven);
                    let cell_hash = u32::try_from(u64::from(cell) % u32::MAX as u64).unwrap_or(0);
                    bitmap.insert(cell_hash);
                }
            }
            
            // Also hash all vertices to be a bit safer for Tier 1
            for coord in polygon.exterior().0.iter() {
                if let Ok(ll) = LatLng::new(coord.y, coord.x) {
                    let cell = ll.to_cell(Resolution::Seven);
                    let cell_hash = u32::try_from(u64::from(cell) % u32::MAX as u64).unwrap_or(0);
                    bitmap.insert(cell_hash);
                }
            }

            zones.push(MarineZone {
                zone_id,
                polygon,
                rule,
            });
        }
    }

    println!("Phase 1 Complete: Loaded {} zones into R-Tree and H3 Bitmap.", zones.len());
    let rtree = RTree::bulk_load(zones);
    (bitmap, rtree)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Phase 1: Startup Config
    let (h3_bitmap, rtree) = load_config_from_db();
    let h3_bitmap = Arc::new(h3_bitmap);
    let rtree = Arc::new(rtree);

    // Phase 2: Ring Buffer / Disruptor Pattern Setup
    // Using a bounded MPMC channel as our zero-copy ring buffer
    let (sender, receiver) = channel::bounded::<VesselTelemetry>(50_000);

    // Spawn Worker Threads (Phase 3: Two-Tier Filter)
    for i in 0..4 {
        let rx = receiver.clone();
        let bitmap_ref = h3_bitmap.clone();
        let rtree_ref = rtree.clone();
        
        thread::spawn(move || {
            // Each worker needs its own DB connection to write alerts without locking
            let mut db_client = Client::connect("host=localhost user=postgres password=hackathon dbname=postgres", NoTls)
                .expect("Worker failed to connect to DB");
                
            println!("Worker {} ready.", i);
            
            while let Ok(vessel) = rx.recv() {
                // Tier 1: H3 Hash (O(1))
                if let Ok(coord) = LatLng::new(vessel.lat, vessel.lon) {
                    let cell = coord.to_cell(Resolution::Seven);
                    let cell_hash = u32::try_from(u64::from(cell) % u32::MAX as u64).unwrap_or(0);

                    if bitmap_ref.contains(cell_hash) {
                        // Tier 2: Exact Point-in-Polygon
                        let pt = Point::new(vessel.lon, vessel.lat);
                        let point_array = [vessel.lon, vessel.lat];
                        
                        // Query R-Tree for candidate polygons
                        for zone in rtree_ref.locate_all_at_point(&point_array) {
                            if zone.polygon.contains(&pt) {
                                // Rule evaluation
                                let mut violation = false;
                                if let Some(limit) = zone.rule.max_speed_knots {
                                    if vessel.speed > limit {
                                        violation = true;
                                    }
                                }
                                
                                if violation {
                                    println!("🚨 VIOLATION DETECTED [Worker {}]: MMSI {} in Zone {}", i, vessel.mmsi, zone.zone_id);
                                    // Phase 4: Asynchronous Dispatch (Worker threads write while main thread ingests)
                                    let _ = db_client.execute(
                                        "INSERT INTO active_alerts (mmsi, latitude, longitude, speed) VALUES ($1, $2, $3, $4)",
                                        &[&vessel.mmsi, &vessel.lat, &vessel.lon, &vessel.speed],
                                    );
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    // Phase 2: The Ingestion Gate (Main Thread)
    let socket = UdpSocket::bind("127.0.0.1:8080").await?;
    println!("Engine listening for vessel telemetry on UDP port 8080...");

    let mut buf = [0; 1024];

    loop {
        let (len, _addr) = socket.recv_from(&mut buf).await?;
        if let Ok(telemetry_str) = std::str::from_utf8(&buf[..len]) {
            if let Ok(vessel) = serde_json::from_str::<VesselTelemetry>(telemetry_str) {
                // Zero-copy handoff: Place in ring buffer. Non-blocking try_send to avoid dropping if buffer full? 
                // We'll use send which blocks if full, applying natural backpressure.
                let _ = sender.send(vessel);
            }
        }
    }
}
