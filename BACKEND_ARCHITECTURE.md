# Backend Architecture & Requirements Specification

**Project**: Vault-X CIH (Indian Maritime Digital Twin & Surveillance Engine)
**Focus**: Backend Systems, Real-Time Processing, and Threat Detection

---

## 1. System Overview
The backend of this project is a high-performance, real-time Maritime Surveillance Engine and Synthetic AIS (Automatic Identification System) Generator. It is designed to simulate a realistic digital twin of Indian maritime traffic while simultaneously evaluating that traffic for security threats at extreme throughput.

---

## 2. Core Requirements

### 2.1 Functional Requirements
*   **Realistic Traffic Simulation**: Must generate synthetic ship movements (kinematics) based on real-world statistical profiles (speed, turning arcs, acceleration) across established Indian shipping lanes, fishing grounds, and offshore assets.
*   **Real-Time Threat Detection**: Must evaluate every incoming AIS message against multiple security heuristics (Geofence intrusion, Dark Fleet behavior, Ship-to-Ship Rendezvous, Risk Scoring).
*   **Dynamic Geofencing**: Support seeding of Marine Protected Areas (MPAs) and Naval Zones, as well as on-the-fly creation of restricted zones.
*   **Live Telemetry Broadcast**: Must push evaluated vessel states and active incidents to frontend clients with sub-second latency.

### 2.2 Non-Functional Requirements
*   **High Throughput**: The system must sustain a processing throughput of **50,000+ messages per second**.
*   **Low Latency**: The critical hot-path (AIS ingestion → Threat Evaluation → Broadcast) must remain strictly `O(1)`.
*   **In-Memory Operation**: To meet the throughput constraints, the current iteration operates entirely in-memory, avoiding database write-locks or I/O bottlenecks.

---

## 3. Technology Stack
*   **Runtime**: Node.js (v22+)
*   **Language**: TypeScript (Strict Mode)
*   **Geospatial Indexing**: `h3-js` (Uber's Hexagonal Hierarchical Spatial Index)
*   **Transport**: `ws` (WebSockets for real-time bidirectional communication)
*   **Build/Execution**: `tsx` for rapid development and execution without pre-compilation.

---

## 4. Architectural Components

The backend follows a modular, coordinator-driven architecture.

### 4.1 Data Layer (`server/data/`)
Serves as the static configuration for the Digital Twin.
*   `ports.ts`: Defines exact coordinates for major Indian ports.
*   `zones.ts`: Defines geospatial perimeters for Fishing Grounds, Offshore Energy Assets, MPAs, and Naval Zones. Automatically generates graded 'Grey Zones' (Buffers).
*   `routes.ts`: Maps waypoints for deep-water shipping corridors.
*   `behavior_template.json`: Pre-processed statistical distributions dictating vessel dimensions and physics.

### 4.2 Synthetic AIS Generator (`server/engine/generator.ts`)
Acts as the simulated data ingestion pipeline.
*   **Kinematic Engine**: Applies heading vectors, turning rates, and acceleration per tick instead of random coordinate jumping.
*   **Autonomous Event Scheduler**: Randomly triggers anomalous behavior (e.g., turning off transponders, loitering) based on vessel archetypes to test the surveillance engines.

### 4.3 Engine Coordinator (`server/engine/index.ts`)
The central orchestrator. It receives raw AIS batches from the Generator, pipes them through the Threat Engines sequentially, and broadcasts the enriched data via WebSockets.

### 4.4 Threat Micro-Engines
Stateless modules that evaluate specific security heuristics.
*   **GeofenceEngine**: Uses H3 to detect intrusions into restricted areas (`latLngToCell` -> `Set.has()`).
*   **DarkFleetEngine**: Tracks AIS signal drops. Escalates severity heavily if a signal drops near a sensitive zone boundary.
*   **RendezvousEngine**: Detects Ship-to-Ship (STS) transfers by flagging dissimilar vessels (e.g., Cargo & Tanker) that occupy the same H3 cell at low speeds for extended durations.
*   **RiskScoringEngine**: An aggregator that assigns a dynamic risk score (0-100) and severity classification (Low/Medium/High/Critical) to a vessel based on accumulated infractions.

---

## 5. Data Flow Diagram

```mermaid
graph TD
    A[Synthetic AIS Generator] -->|Raw Batch (Tick)| B(Engine Coordinator)
    
    subgraph Threat Evaluation Pipeline
    B --> C[Geofence Engine]
    B --> D[Dark Fleet Engine]
    B --> E[Rendezvous Engine]
    B --> F[Risk Scoring Engine]
    end
    
    C --> B
    D --> B
    E --> B
    F --> B
    
    B -->|Enriched Batch & Alerts| G((WebSocket Server))
    G -->|JSON Payload| H[Frontend React Dashboard]
```

---

## 6. Future Database Integration Architecture

While the current system is purely in-memory to guarantee 50k+ msg/sec throughput, production deployment will require data persistence. The recommended architecture for introducing databases without compromising the hot-path is the **Event-Sourced / Cache-Aside** pattern:

1.  **Redis (In-Memory Datastore)**
    *   **Role**: Replace the local Node.js variables (`Map`, `Array`) for state management.
    *   **Usage**: Caching the latest known state of all vessels and active threat incidents. Allows multiple Node.js backend instances to scale horizontally.
2.  **Apache Kafka / RabbitMQ (Message Broker)**
    *   **Role**: Decouple the real-time processing from database writes.
    *   **Usage**: The Engine Coordinator publishes the evaluated batches to a message queue.
3.  **TimescaleDB / PostgreSQL (Time-Series Relational DB)**
    *   **Role**: Permanent storage and analytics.
    *   **Usage**: A separate consumer service reads from the message queue and batch-inserts historical AIS trails and incident logs into the database for post-incident investigation.
