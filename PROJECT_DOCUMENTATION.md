# Vault-X CIH: Indian Maritime Digital Twin & Surveillance Engine

This document outlines the architecture, features, and implementation details of the Vault-X CIH Real-Time Maritime Surveillance Engine built to date.

## 1. Core Architecture & High-Performance Design
The system is designed to handle **50,000+ AIS messages per second**. This is achieved by separating the kinematic generation of synthetic AIS data from the highly optimized threat detection engine.

* **Hot-Path Optimization**: The core surveillance loop relies entirely on **H3 (Hexagonal Hierarchical Geospatial Indexing System)**. Instead of complex polygon intersection math (Point-in-Polygon), coordinates are instantly hashed to an H3 cell ID (`latLngToCell`). Geofences are evaluated using an `O(1)` HashSet lookup.

## 2. Indian Maritime Digital Twin (Data Layer)
The synthetic AIS generator was completely overhauled to simulate realistic traffic across the Indian Coastline, Arabian Sea, and Bay of Bengal, based on statistical distributions extracted from real-world AIS datasets.

### **Behavioral Template Extraction**
* Extracted speed, heading, and dimensional (length, width, draft) distributions for **13 vessel archetypes** (Cargo, Tanker, Fishing, Naval Patrol, Coast Guard, Supply, etc.) from a 241MB AIS dataset (`extract_behavior.ts`).
* The engine uses `behavior_template.json` to assign realistic physical limits to each vessel.

### **Geospatial Data (`server/data/`)**
* **Ports (`ports.ts`)**: 16 real Indian ports spanning the West Coast (Mumbai, Kochi, Kandla), East Coast (Chennai, Vizag), and Island Territories (Port Blair, Lakshadweep).
* **Zones (`zones.ts`)**: 
  * **7 Marine Protected Areas (MPAs)** (e.g., Gulf of Mannar, Malvan).
  * **5 Naval Zones** (e.g., INS Kadamba, Western Naval Command).
  * **7 Fishing Grounds** and **6 Offshore Energy Assets** (e.g., Mumbai High, KG-D6 Basin).
  * **Grey Zones**: Auto-generated 5km Buffer and 15km Observation zones around restricted areas.
* **Routes (`routes.ts`)**: 25+ realistic shipping corridors mapping deep-water lanes (e.g., Mumbai to Dubai, Kochi to Singapore).

## 3. Kinematic AIS Generator (`generator.ts`)
The simulator generates a fleet of **800 vessels** using a continuous kinematic physics model rather than random movement.

* **Movement Physics**: Ships update positions based on `heading += turnRate` and `speed += acceleration`, with subtle GPS noise and ocean drift applied every tick.
* **Archetype Behaviors**:
  * **Routing**: Cargo and tankers smoothly follow straight waypoints.
  * **Fishing**: Fishing vessels actively drift, slow down to haul nets, and change headings randomly within designated fishing grounds.
  * **Supply Loop**: Supply vessels constantly shuttle between service ports and offshore platforms.
  * **Patrol Orbit**: Naval and coast guard vessels orbit their assigned bases.
* **Autonomous Event Scheduler**: Automatically triggers "Dark Fleet" (AIS off), "Illegal Fishing" (Zone Intrusion), and "Loitering" based on vessel-specific probabilistic behaviors.

## 4. Threat Detection Engines (`server/engine/`)
Multiple micro-engines analyze the incoming AIS stream to detect anomalous and suspicious behaviors.

* **Geofence Engine (`geofence.ts`)**: Automatically seeds H3 cells representing MPAs and Naval Zones on engine startup. Evaluates intrusions in `O(1)` time.
* **Rendezvous Engine (`rendezvous.ts`)**: Detects potential Ship-to-Ship (STS) transfers (e.g., illegal oil bunkering or smuggling) by checking if two interacting vessel types (e.g., Tanker and Cargo) occupy the same H3 cell at low speeds for a prolonged period.
* **Dark Fleet Engine (`darkFleet.ts`)**: Detects vessels that intentionally turn off their AIS transponders. Severity dynamically escalates if the vessel vanishes near a restricted zone or buffer area.
* **Risk Scoring Engine (`riskScoring.ts`)**: Continuously calculates a real-time `riskScore` for every vessel. Escalates risk categories (Low, Medium, High, Critical) based on zone proximity, speed violations, and accumulated alerts.

## 5. Frontend Dashboard UI (`src/components/layout/`)
The React/Vite dashboard was updated to render the live Digital Twin and handle the new threat vectors without disrupting the existing UX.

* **MapCanvas**:
  * Replaced static SVG mock overlays with a dynamic **H3 Hexagon Grid** (`H3GridOverlay`).
  * Restricted zones (MPAs, Naval Bases) dynamically light up red on the grid based on the backend H3 engine state.
  * Vessel markers visually distinguish high-risk vessels (red pulse) from normal traffic.
* **BottomWorkspace**:
  * Added dedicated tabs for **Dark Fleet** tracking, **Rendezvous** incident logging, and a leaderboard of **Top Risk Vessels**.
* **Engine Store (`useEngineStore.ts`)**:
  * Consumes WebSocket updates. Manages vessel history trails to visually display recent vessel paths on the map.

## 6. Version Control
* Created the `trishal` branch for development.
* Staged and committed the entire implementation (15 files, 1,825 insertions).
* Successfully merged changes back into `main` and pushed to the remote repository.
