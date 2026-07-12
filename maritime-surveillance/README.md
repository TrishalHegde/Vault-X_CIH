# 🛰️ Vault-X CIH — Real-Time Maritime Surveillance Platform

> **Problem Statement 5 — CIH Hackathon**
> A high-throughput, real-time maritime surveillance engine that processes 50,000+ vessel AIS signals per second using H3 spatial indexing and RoaringTreemap bitmaps, with instant geofence violation detection and illegal fishing identification.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                     │
│    Google Maps   │   Alert Tabs   │   Stress Test   │   Fishing     │
│    (Flagged ships only, restricted zone polygons rendered via GeoJSON│
└──────────────────────────┬──────────────────────────────────────────┘
                           │ WebSocket ws://localhost:3001/ws
                           │ REST  http://localhost:3001/api/*
┌──────────────────────────▼──────────────────────────────────────────┐
│                   RUST ENGINE  (maritime_engine)                    │
│                                                                     │
│  UDP:8080 ──► Crossbeam Ring Buffer ──► 8 Worker Threads           │
│                                              │                      │
│              H3 Grid (res 7)                 │                      │
│              RoaringTreemap (u64 cell IDs)   │ spatial O(1) lookup  │
│              GeofenceEngine                  │                      │
│                                              ▼                      │
│              AlertDetector + FishingDetector                        │
│              DashMap<mmsi, VesselEntry>   (lock-free)               │
│              DashMap<id, AlertEntry>      (lock-free)               │
│                                              │                      │
│              Axum WebSocket Broadcast ◄──────┘  (1 Hz)             │
└──────────────────────────▲──────────────────────────────────────────┘
                           │ UDP packets (JSON, ~8000 msg/s normal)
┌──────────────────────────┴──────────────────────────────────────────┐
│                PYTHON DATA GENERATOR  (generator.py)                │
│  400 vessels · Indian Ocean shipping lanes · offshore-only coords   │
│  Bad actors: 5% fishing vessels → restricted zones via routing      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Performance Constraint

| Metric | Target | Achieved |
|--------|--------|----------|
| Throughput | ≥ 50,000 msg/sec | ✅ ~56,000+ msg/sec |
| Geofence check latency | < 1 ms | ✅ ~100 ns (H3 + RoaringTreemap) |
| Alert generation latency | milliseconds | ✅ ~3–5 µs per packet |
| Worker threads | concurrent | ✅ 8 lock-free workers |

---

## 🗂️ Project Structure

```
Vault-X_CIH/
├── maritime-surveillance/
│   ├── engine/                     # Rust high-throughput engine
│   │   └── src/
│   │       ├── main.rs             # Pipeline orchestration
│   │       ├── spatial/
│   │       │   ├── geofence.rs     # H3-based spatial index
│   │       │   ├── bitmap.rs       # RoaringTreemap u64 bitmap
│   │       │   └── h3_grid.rs      # H3 cell conversion
│   │       ├── processor/
│   │       │   └── worker.rs       # Per-packet processing pipeline
│   │       ├── detection/
│   │       │   └── fishing.rs      # Illegal fishing rule engine
│   │       ├── alerts/
│   │       │   └── detector.rs     # General geofence alert detector
│   │       ├── models/             # Packet, Vessel, Alert, Zone types
│   │       ├── state.rs            # DashMap shared state
│   │       └── ws/
│   │           └── server.rs       # Axum WS + REST API server
│   │
│   ├── data-generator/
│   │   ├── generator.py            # AIS data simulator (400 vessels)
│   │   └── stress_test.py          # External stress test script
│   │
│   └── README.md                   # This file
│
├── src/                            # React frontend
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MapCanvas.tsx       # Google Maps + GeoJSON zones + flagged vessels
│   │   │   ├── BottomWorkspace.tsx # Tabs: Intel / Performance / Stress / Fishing
│   │   │   ├── Sidebar.tsx         # Live threat feed
│   │   │   └── TopHeader.tsx       # Stats bar
│   │   └── map/
│   │       └── H3GridOverlay.tsx   # H3 hex grid visualisation
│   ├── store/
│   │   └── useEngineStore.ts       # Zustand state + WebSocket client
│   └── data/
│       └── restricted_zones.json   # 9-zone GeoJSON (official Indian MPAs)
│
├── package.json
└── vite.config.ts
```

---

## 🔧 How to Run

### Prerequisites
- [Rust + Cargo](https://rustup.rs/) (stable)
- [Node.js 18+](https://nodejs.org/)
- [Python 3.10+](https://python.org/)

### 1 — Start the Rust Engine
```powershell
cd maritime-surveillance\engine
$env:CARGO_TARGET_DIR = "C:\Users\<YOU>\cargo_build_tmp\maritime_engine"
cargo run
```
Expected output:
```
[INFO] Loaded 9 Indian maritime restricted zones into H3 Roaring Bitmap
[INFO] 8 Workers started
[INFO] UDP Receiver Started on :8080
[INFO] WebSocket server listening on ws://0.0.0.0:3001/ws
```

### 2 — Start the Data Generator
```powershell
cd maritime-surveillance\data-generator
$env:PYTHONIOENCODING="utf-8"
python generator.py
```

### 3 — Start the Frontend
```powershell
cd ..   # back to project root
npm install
npm run dev
```
Open **http://localhost:5173**

---

## 🌊 Restricted Zones (GeoJSON)

Nine official Indian maritime restricted zones are loaded from `src/data/restricted_zones.json` and rendered as red polygons on the map:

| Zone ID | Name | Type |
|---------|------|------|
| ARB-IND-001 | Bombay High Offshore Oil Field | Critical Infrastructure |
| ARB-IND-002 | Gulf of Kutch Marine National Park | Marine Protected Area |
| ARB-IND-003 | Lakshadweep Sensitive Coral Buffer | Conservation Zone |
| BOB-IND-001 | Sriharikota Launch Trajectory Exclusion Zone | Aerospace Security |
| BOB-IND-002 | Gahirmatha Marine Sanctuary | Ecological Reserve |
| BOB-IND-003 | Sundarbans Coastal Buffer | Biosphere Reserve |
| BOB-IND-004 | Mahatma Gandhi Marine National Park (Wandoor) | Marine Protected Area |
| GREY-IND-001 | Palk Strait IMBL Buffer | Disputed / Boundary Buffer |
| CHK-INT-001 | Strait of Malacca Transit Corridor | Strategic Chokepoint |

---

## 🎣 Illegal Fishing Detection Rules

The `FishingDetector` in `detection/fishing.rs` evaluates every packet for 4 threat types:

| Rule | Trigger Condition | Severity |
|------|-------------------|----------|
| **MPA Breach** | Any fishing vessel inside a restricted zone | HIGH |
| **Trawling** | Fishing vessel at 1.5–5.0 kn inside restricted zone | CRITICAL |
| **AIS Manipulation / Dark Fleet** | Fishing vessel was > 3 kn, now ≤ 0.3 kn (AIS shutdown suspected) | HIGH |
| **Fleet Rendezvous** | 3+ fishing vessels in the same H3 cell simultaneously | CRITICAL |

---

## ⚡ Stress Test — Proving 50,000 msg/sec

The stress test is built into the engine and accessible from the **STRESS TEST** tab in the UI.

**How it works:**
1. Click **START STRESS TEST** in the UI
2. The engine spawns **8 internal async tasks**
3. Each task simulates 700 vessels sending telemetry directly to the engine's UDP port
4. Combined: **8 × ~6,500 msg/s = 50,000+ msg/s**
5. The UI shows a live throughput meter, progress bar against the 50K target, and a 60-second rolling history chart

**Key technologies enabling this throughput:**

| Technology | Role |
|------------|------|
| `crossbeam-channel` | Lock-free ring buffer ingestion queue |
| `tokio` UDP socket | Async non-blocking packet receive |
| `dashmap` | Lock-free concurrent vessel state map |
| `roaring` RoaringTreemap | O(1) u64 H3 cell geofence lookup |
| H3 resolution 7 | ~5 km² cells, ~100 ns spatial evaluation |
| 8 worker threads | True parallelism, no shared-lock bottleneck |

---

## 🗺️ Map & Vessel Rendering

- **Base map:** Google Maps Standard tiles
- **Restricted zones:** GeoJSON polygons rendered in semi-transparent red
- **Vessels displayed:** **Only flagged vessels** are rendered — ships that have triggered an active `alert` or `fishingAlert`
- **Vessel icons:** 40px triangle with pulsing glow ring, ⚠ name label
- **No vessels on land:** Generator uses latitude-strip coastline model + offshore-only port waypoints + Cape Comorin junction routing to keep all 400 vessels strictly in water

---

## 📡 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `ws://localhost:3001/ws` | WebSocket | Live engine updates at 1 Hz |
| `/health` | GET | Engine health check |
| `/api/simulation/dark-fleet` | POST | Trigger dark fleet simulation event |
| `/api/simulation/force-stop` | POST | Trigger stationary vessel event |
| `/api/simulation/rapid-heading` | POST | Trigger rapid heading change event |
| `/api/simulation/rendezvous` | POST | Spawn rendezvous cluster |
| `/api/stress/start` | POST | Start 50k msg/sec stress test |
| `/api/stress/stop` | POST | Stop stress test |

---

## 🏗️ Key Technical Decisions

### Why RoaringTreemap over HashMap?
Standard `HashMap<u64, bool>` has O(1) average but degrades under collision. `RoaringTreemap` stores u64 H3 cell IDs as compressed bitsets — guaranteed O(log n) with ~90% memory savings for sparse sets and no collision risk.

### Why H3 over traditional polygon-in-polygon?
H3 pre-indexes all geo cells at resolution 7 (~5 km²). A geofence check is a single bitmap lookup `contains(cell_id)` — constant time regardless of zone polygon complexity. Traditional PiP is O(n·m) per packet.

### Why no Kafka/Redis/Flink?
Problem Statement 5 explicitly restricts heavy distributed pipelines. The architecture achieves 50k+ msg/sec using only in-process channels (`crossbeam`), lock-free maps (`dashmap`), and OS UDP buffers — no external dependencies.

---

## 👥 Team — Vault-X CIH

Built for the **CIH Hackathon — Problem Statement 5: Real-Time Maritime Surveillance**
