# Product Requirements Document
## Real-Time Maritime Surveillance Engine

---

## 1. Problem Statement

**Background**

Maritime authorities monitor millions of ship location updates daily to protect ecosystems and detect illegal fishing. Processing this massive volume of real-time geographical data is difficult, and traditional systems often bottleneck under heavy load. The goal is to build a scalable monitoring platform that enhances regulatory compliance and accelerates threat response by instantly identifying maritime violations.

**Constraints**

| # | Constraint | Requirement |
|---|---|---|
| 1 | No Heavy Distributed Pipelines | Avoid high-overhead data streaming frameworks (Kafka, Flink, Spark, hosted message queues). Use a clean, compact systems design. |
| 2 | Strict Throughput Floor | The engine must process and evaluate at least **50,000 incoming vessel location messages per second** on standard hardware. |
| 3 | Real-Time Alerts | Geofence violation detection must trigger within **milliseconds** of receiving a message. |

**Expected Outcome**

A high-throughput stream processing engine that performs instantaneous spatial evaluations and alerting on high-velocity data streams.

---

## 2. Solution Overview

The core design decision behind this system: **do the expensive work once, ahead of time — not repeatedly, live.**

Instead of running point-in-polygon geometry checks per incoming message (the approach that bottlenecks traditional systems), all protected zones are pre-converted into **H3 hexagon IDs** at startup and stored in an in-memory hash `Set`. Every incoming vessel position is converted to its corresponding hexagon ID and checked against that set — an O(1) lookup instead of an O(N) geometry calculation.

This single design choice is what allows a single process, on standard hardware, to clear the 50,000 msgs/sec floor with sub-millisecond evaluation latency, without any distributed streaming infrastructure.

### 2.1 How Each Constraint Is Met

**No Heavy Distributed Pipelines**
- One process handles ingestion, evaluation, and alerting.
- No Kafka/Flink/Spark, no hosted queue, no per-message database write.
- All zone data lives in RAM; disk and network I/O are kept off the hot path entirely.

**50,000+ Messages/Second**
- Zone membership checks are O(1) hash lookups, not geometry math.
- A synthetic high-frequency generator (separate thread/loop) feeds the evaluator via zero-copy data structures (e.g. `SharedArrayBuffer`/typed arrays) rather than JSON serialization per message.
- Metrics (throughput, latency) are sampled and broadcast on a fixed interval (~200ms) rather than per message, so the metrics pipeline itself never becomes the bottleneck.
- Throughput is measured as a **rolling average**, not an instantaneous spike, to prove sustained — not bursty — performance.

**Millisecond Alerts**
- Because evaluation is a single hash lookup, time from "message received" to "violation known" is a fraction of a millisecond.
- WebSocket alerts are emitted **only on actual violations**, not per message, keeping the alert channel lightweight and fast under load.

### 2.2 Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                      Single Node.js Process                   │
│                                                                 │
│   Generator Thread            Hot Path (main thread)          │
│   (synthetic AIS data,   →    1. latLngToCell(lat, lng)       │
│    zero-copy buffer)          2. forbiddenSet.has(cellId)     │
│                                3. counter++                    │
│                                4. violation? → push alert       │
│                                                                 │
│   Every 200ms: emit metrics        On violation: emit alert    │
│                        ↓                    ↓                  │
│                    WebSocket Server (socket.io / ws)           │
└─────────────────────────────────────────────────┼─────────────┘
                                                    ↓
                              React Frontend — Map, live metrics,
                              violation feed, alert dashboard
```

### 2.3 Why This Differs From Conventional Approaches

Typical solutions to this problem statement default to one of two patterns, both of which conflict with the constraints:

1. **Distributed streaming architectures** (message queues, worker pools, multi-service pipelines) — these add network hops, serialization overhead, and coordination cost that work against a strict throughput floor rather than for it.
2. **Real point-in-polygon geometry checks per message** — mathematically correct, but computationally expensive at 50,000 evaluations/second, and gets slower as zone complexity increases.

This system avoids both by pre-computing the hard part (geometry) once at startup, and reducing the real-time hot path to a single hash lookup. Fewer moving parts also means every claimed number (throughput, latency) can be demonstrated live and sustained, rather than asserted.

---

## 3. Core Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | System shall ingest simulated vessel location messages at a sustained rate of ≥50,000/sec. |
| FR-2 | System shall convert each incoming coordinate to an H3 hexagon ID and evaluate zone membership in O(1) time. |
| FR-3 | System shall emit a violation alert within milliseconds of detecting a geofence breach. |
| FR-4 | System shall display live throughput (msgs/sec) and evaluation latency (ms) as a rolling average. |
| FR-5 | System shall render vessel positions, protected zones, and violation events on a live map. |
| FR-6 | System shall run as a single process with no external distributed streaming dependency. |

---

## 4. Standout Features

These features extend the platform's coverage of real-world maritime violation scenarios beyond static geofencing. Each is designed to reuse the existing hash-lookup/in-memory architecture and run either as part of the same O(1) hot-path check or as a lightweight periodic sweep **off** the hot path — so none of them affect the 50,000 msgs/sec throughput floor or the millisecond alert requirement.

### 4.1 Dynamic Geofences (e.g., "Whale Pod Protection")

**Purpose:** Static polygons can't represent real-world protected zones that move — migrating whale pods, drifting oil spills, seasonal fishing closures. This feature allows protected zones to move in real time with zero performance impact.

**How it works:**
- A protected zone's center follows a predefined path (e.g. a scripted sequence of waypoints representing whale pod migration) with a fixed radius around it.
- On a fixed interval (e.g. every 5–10 seconds), the system recomputes the H3 hexagons covering the zone's new position.
- The forbidden/sensitive hexagon `Set` is updated incrementally: new hexagons are added, hexagons no longer in range are removed.
- The hot-path lookup logic is completely unchanged — it simply checks against whatever hexagons currently exist in the `Set`. There is no rebuild, pause, or geometry recalculation on the ingestion path.

**Combined with speed enforcement:** Sensitive zones (e.g. whale habitats) carry an associated speed limit. Any vessel inside the zone's *current* hexagon footprint is checked against that limit as part of the same lookup — flagged if exceeded. Because the check is always against the live `Set`, the speed rule automatically applies only to the zone's current location, not any historical one.

**Why this matters:** It directly demonstrates the core architectural claim — that zone changes cost nothing on the hot path — in a way that is visually provable during a live demo (the protected zone visibly moves on the map while throughput and latency numbers remain unaffected).

**Requirements:**

| ID | Requirement |
|---|---|
| FR-7 | System shall support geofences whose boundary updates on a timed interval without interrupting message evaluation. |
| FR-8 | System shall support a speed threshold attached to a geofence, evaluated only against the zone's current position. |
| FR-9 | Zone boundary updates shall not measurably degrade sustained throughput or evaluation latency. |

---

### 4.2 Dark Fleet Detection (Transponder Drop-off)

**Purpose:** Vessels engaged in illegal activity often stop broadcasting their position deliberately ("going dark") to avoid detection — this is frequently a stronger signal of wrongdoing than a simple speed or boundary violation.

**How it works:**
- A lightweight `Map` tracks the last-seen timestamp for every vessel ID, updated on every incoming message (O(1) per message, no impact on throughput).
- A separate periodic sweep (e.g. every 10 seconds), running independently of the main ingestion loop, checks all tracked vessels: if a vessel hasn't reported a position within a defined threshold (e.g. 3 minutes), it is flagged as a "Dark Fleet Anomaly."
- Severity is escalated if the vessel's last known position was inside or near a sensitive/restricted zone — a vessel disappearing at the edge of a protected area is treated as significantly more suspicious than one going dark in open water.
- Once flagged, a vessel is marked to avoid duplicate repeat alerts for the same silence event.

**Why this matters:** This adds an entirely different class of violation — detection by *absence* of data rather than presence of a violation — broadening the platform's real-world coverage without adding any cost to the ingestion hot path, since the sweep runs over the (much smaller) set of distinct vessels, not the 50,000/sec message stream.

**Requirements:**

| ID | Requirement |
|---|---|
| FR-10 | System shall track last-seen timestamp per vessel with O(1) update cost per message. |
| FR-11 | System shall periodically (independent of the ingestion hot path) identify vessels exceeding a silence threshold and emit an anomaly alert. |
| FR-12 | System shall assign higher severity to drop-offs occurring inside or near a protected/restricted zone. |

---

### 4.3 Rendezvous / Ship-to-Ship Meeting Detection

**Purpose:** Illegal transshipment — transferring cargo or catch between vessels at sea to avoid inspection — is a well-known evasion tactic. Detecting two vessels occupying the same location for an extended period, particularly in open water far from ports, is a strong indicator of this activity.

**How it works:**
- In addition to the existing `hexId → forbidden boolean` lookup, the system maintains a lightweight dictionary mapping `hexId → [vessel IDs currently present]`, updated as part of the same per-message hex computation already being performed.
- If two or more distinct vessels remain within the same hexagon (or adjacent hexagons) for longer than a defined duration, the system flags a potential rendezvous event.
- Optional refinement: suppress alerts near known ports/harbors, since co-location there is expected and not anomalous.

**Why this matters:** This reuses the same hexagon computation already produced for every message — no additional spatial calculation is introduced — while adding detection for a distinct and operationally significant violation type (illegal at-sea transfers), further differentiating the platform from systems limited to simple boundary and speed checks.

**Requirements:**

| ID | Requirement |
|---|---|
| FR-13 | System shall track which vessels currently occupy each hexagon using the hex ID already computed during zone evaluation. |
| FR-14 | System shall flag two or more vessels co-located in the same or adjacent hexagons beyond a defined duration as a potential rendezvous event. |
| FR-15 | Rendezvous detection shall not introduce additional geometry computation beyond the existing hex lookup already performed per message. |

---

## 5. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | The system shall run as a single process on standard hackathon-grade hardware (a single laptop), without reliance on external distributed infrastructure. |
| NFR-2 | Throughput and latency metrics shall be measured as sustained rolling averages, demonstrable continuously rather than as a one-time peak. |
| NFR-3 | All zone data (static and dynamic), vessel state, and tracking maps shall be held in memory; no per-message disk or database writes shall occur on the hot path. |
| NFR-4 | Additional detection features (dynamic geofences, dark fleet detection, rendezvous detection) shall not measurably reduce sustained throughput below the 50,000 msgs/sec floor or increase evaluation latency beyond the millisecond requirement. |

---

## 6. Success Criteria

- Live dashboard sustains ≥50,000 messages/sec processed, shown as a continuous rolling average, not a momentary spike.
- Evaluation latency remains in the sub-millisecond to low-single-digit-millisecond range throughout the demo.
- A dynamic (moving) protected zone is visibly updated on the map in real time with no observable impact on throughput or latency.
- At least one scripted vessel triggers a Dark Fleet anomaly alert during the live demo.
- At least one scripted rendezvous event between two vessels is detected and surfaced as an alert during the live demo.
- The system operates entirely as a single process, with no distributed streaming framework in the architecture.
