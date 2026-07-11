// @ts-ignore
import isSea from 'is-sea';
import { ALL_ROUTES, Route } from '../data/routes';
import { INDIAN_PORTS, Port, PORT_MAP } from '../data/ports';
import { FISHING_GROUNDS, OFFSHORE_ASSETS, OffshoreAsset } from '../data/zones';

// ─── Vessel Type Definitions ─────────────────────────────────────────────────

export type VesselType =
  | 'cargo'
  | 'container'
  | 'bulk_carrier'
  | 'tanker'
  | 'fishing'
  | 'passenger'
  | 'naval_patrol'
  | 'coast_guard'
  | 'supply'
  | 'research'
  | 'pilot_boat'
  | 'tug'
  | 'military';

export type AISState = 'ON' | 'OFF' | 'INTERMITTENT';
export type NavStatus = 'Under way' | 'At anchor' | 'Restricted' | 'Engaged in fishing' | 'Not under command';
export type SpeedCategory = 'Stopped' | 'Slow' | 'Moderate' | 'Fast';

// ─── AIS Message (Public Interface) ──────────────────────────────────────────

export interface AISMessage {
  id: string;
  mmsi: string;
  name: string;
  lat: number;
  lng: number;
  type: VesselType;
  heading: number;
  speed: number;
  risk: 'low' | 'medium' | 'high' | 'critical';
  riskScore?: number;
  timestamp: number;
  originPort?: string;
  destinationPort?: string;
  length?: number;
  width?: number;
  draft?: number;
  navStatus?: NavStatus;
  aisState?: AISState;
  destination?: string;
}

// ─── Vessel Archetypes ────────────────────────────────────────────────────────

interface VesselArchetype {
  type: VesselType;
  normalSpeedKnots: number;
  maxSpeedKnots: number;
  minSpeedKnots: number;
  turnRateDegPerSec: number;   // how fast it turns
  accelerationKnotsPerSec: number;
  lengthRange: [number, number];
  widthRange: [number, number];
  draftRange: [number, number];
  aisReliability: number;      // 0-1, probability of having AIS on
  allowedRoutePrefixes: string[];
  behaviourMode: 'routing' | 'fishing' | 'supply_loop' | 'patrol_loop' | 'anchored';
  mmsiPrefix: string;
}

const ARCHETYPES: Record<VesselType, VesselArchetype> = {
  cargo: {
    type: 'cargo', normalSpeedKnots: 12, maxSpeedKnots: 16, minSpeedKnots: 4,
    turnRateDegPerSec: 0.03, accelerationKnotsPerSec: 0.01,
    lengthRange: [100, 200], widthRange: [15, 32], draftRange: [6, 12],
    aisReliability: 0.99, allowedRoutePrefixes: ['ROUTE-MUMBAI', 'ROUTE-CHENNAI', 'ROUTE-KOCHI', 'ROUTE-KANDLA', 'ROUTE-VIZAG', 'ROUTE-MORMUGAO', 'ROUTE-PARADIP', 'ROUTE-PORTBLAIR'],
    behaviourMode: 'routing', mmsiPrefix: '419',
  },
  container: {
    type: 'container', normalSpeedKnots: 18, maxSpeedKnots: 22, minSpeedKnots: 6,
    turnRateDegPerSec: 0.02, accelerationKnotsPerSec: 0.008,
    lengthRange: [200, 366], widthRange: [30, 50], draftRange: [10, 15],
    aisReliability: 0.999, allowedRoutePrefixes: ['ROUTE-MUMBAI', 'ROUTE-CHENNAI', 'ROUTE-KOCHI', 'ROUTE-VIZAG', 'ROUTE-PORTBLAIR'],
    behaviourMode: 'routing', mmsiPrefix: '419',
  },
  bulk_carrier: {
    type: 'bulk_carrier', normalSpeedKnots: 11, maxSpeedKnots: 14, minSpeedKnots: 3,
    turnRateDegPerSec: 0.02, accelerationKnotsPerSec: 0.005,
    lengthRange: [120, 280], widthRange: [20, 45], draftRange: [8, 16],
    aisReliability: 0.98, allowedRoutePrefixes: ['ROUTE-PARADIP', 'ROUTE-VIZAG', 'ROUTE-HALDIA', 'ROUTE-KANDLA', 'ROUTE-MUMBAI'],
    behaviourMode: 'routing', mmsiPrefix: '419',
  },
  tanker: {
    type: 'tanker', normalSpeedKnots: 11, maxSpeedKnots: 15, minSpeedKnots: 5,
    turnRateDegPerSec: 0.015, accelerationKnotsPerSec: 0.006,
    lengthRange: [150, 330], widthRange: [25, 60], draftRange: [10, 20],
    aisReliability: 0.99, allowedRoutePrefixes: ['ROUTE-KANDLA', 'ROUTE-MUMBAI-DUBAI', 'ROUTE-MUMBAI-MUSCAT', 'ROUTE-KOCHI', 'ROUTE-VIZAG'],
    behaviourMode: 'routing', mmsiPrefix: '419',
  },
  fishing: {
    type: 'fishing', normalSpeedKnots: 4, maxSpeedKnots: 8, minSpeedKnots: 0,
    turnRateDegPerSec: 0.3, accelerationKnotsPerSec: 0.05,
    lengthRange: [10, 45], widthRange: [3, 10], draftRange: [1.5, 4],
    aisReliability: 0.4, allowedRoutePrefixes: [],
    behaviourMode: 'fishing', mmsiPrefix: '419',
  },
  passenger: {
    type: 'passenger', normalSpeedKnots: 15, maxSpeedKnots: 20, minSpeedKnots: 5,
    turnRateDegPerSec: 0.05, accelerationKnotsPerSec: 0.02,
    lengthRange: [50, 200], widthRange: [10, 30], draftRange: [4, 10],
    aisReliability: 0.999, allowedRoutePrefixes: ['ROUTE-MUMBAI', 'ROUTE-KOCHI', 'ROUTE-CHENNAI', 'ROUTE-PORTBLAIR', 'ROUTE-LAKSHADWEEP'],
    behaviourMode: 'routing', mmsiPrefix: '419',
  },
  naval_patrol: {
    type: 'naval_patrol', normalSpeedKnots: 18, maxSpeedKnots: 30, minSpeedKnots: 5,
    turnRateDegPerSec: 0.5, accelerationKnotsPerSec: 0.1,
    lengthRange: [80, 160], widthRange: [10, 18], draftRange: [4, 8],
    aisReliability: 0.6, allowedRoutePrefixes: [],
    behaviourMode: 'patrol_loop', mmsiPrefix: '419',
  },
  coast_guard: {
    type: 'coast_guard', normalSpeedKnots: 20, maxSpeedKnots: 35, minSpeedKnots: 0,
    turnRateDegPerSec: 0.6, accelerationKnotsPerSec: 0.15,
    lengthRange: [40, 100], widthRange: [6, 12], draftRange: [2, 5],
    aisReliability: 0.85, allowedRoutePrefixes: [],
    behaviourMode: 'patrol_loop', mmsiPrefix: '419',
  },
  supply: {
    type: 'supply', normalSpeedKnots: 10, maxSpeedKnots: 14, minSpeedKnots: 2,
    turnRateDegPerSec: 0.1, accelerationKnotsPerSec: 0.03,
    lengthRange: [50, 100], widthRange: [10, 18], draftRange: [3, 6],
    aisReliability: 0.95, allowedRoutePrefixes: ['ROUTE-MH-SUPPLY', 'ROUTE-KGD6-SUPPLY'],
    behaviourMode: 'supply_loop', mmsiPrefix: '419',
  },
  research: {
    type: 'research', normalSpeedKnots: 8, maxSpeedKnots: 12, minSpeedKnots: 0,
    turnRateDegPerSec: 0.2, accelerationKnotsPerSec: 0.04,
    lengthRange: [50, 120], widthRange: [10, 18], draftRange: [3, 6],
    aisReliability: 0.95, allowedRoutePrefixes: [],
    behaviourMode: 'routing', mmsiPrefix: '419',
  },
  pilot_boat: {
    type: 'pilot_boat', normalSpeedKnots: 12, maxSpeedKnots: 18, minSpeedKnots: 0,
    turnRateDegPerSec: 0.8, accelerationKnotsPerSec: 0.2,
    lengthRange: [10, 25], widthRange: [3, 6], draftRange: [1, 2.5],
    aisReliability: 0.95, allowedRoutePrefixes: [],
    behaviourMode: 'patrol_loop', mmsiPrefix: '419',
  },
  tug: {
    type: 'tug', normalSpeedKnots: 6, maxSpeedKnots: 10, minSpeedKnots: 0,
    turnRateDegPerSec: 0.5, accelerationKnotsPerSec: 0.1,
    lengthRange: [20, 45], widthRange: [7, 14], draftRange: [2, 5],
    aisReliability: 0.9, allowedRoutePrefixes: [],
    behaviourMode: 'patrol_loop', mmsiPrefix: '419',
  },
  military: {
    type: 'military', normalSpeedKnots: 20, maxSpeedKnots: 35, minSpeedKnots: 0,
    turnRateDegPerSec: 0.8, accelerationKnotsPerSec: 0.2,
    lengthRange: [80, 180], widthRange: [10, 22], draftRange: [4, 10],
    aisReliability: 0.3, allowedRoutePrefixes: [],
    behaviourMode: 'patrol_loop', mmsiPrefix: '419',
  },
};

// Fleet composition (fraction of total fleet)
const FLEET_COMPOSITION: [VesselType, number][] = [
  ['fishing',      0.30],
  ['cargo',        0.18],
  ['tanker',       0.10],
  ['container',    0.08],
  ['bulk_carrier', 0.07],
  ['tug',          0.08],
  ['passenger',    0.05],
  ['supply',       0.04],
  ['coast_guard',  0.03],
  ['naval_patrol', 0.02],
  ['military',     0.02],
  ['research',     0.02],
  ['pilot_boat',   0.01],
];

// ─── Internal Vessel State ────────────────────────────────────────────────────

const DEG_PER_KM = 1 / 111.0;
const KNOTS_TO_KM_PER_SEC = 1.852 / 3600;
const SIM_SPEED_MULTIPLIER = 60; // 1 real sec = 60 sim seconds for visible movement

interface ActiveVessel extends AISMessage {
  archetype: VesselArchetype;
  route: Route | null;
  targetWaypointIndex: number;
  homePort: Port;
  targetPort: Port | null;
  fishingGround: (typeof FISHING_GROUNDS)[0] | null;
  offshoreAsset: OffshoreAsset | null;
  aisStateTimer: number;          // ticks until next AIS state change
  stationaryTimer: number;        // ticks remaining stopped (fishing, anchored)
  heading: number;
  targetHeading: number;
  speedKnots: number;
  targetSpeedKnots: number;
  gpsDrift: number;               // tiny noise per update
  eventTimer: number;             // ticks until next autonomous event
}

// ─── Utility Functions ────────────────────────────────────────────────────────

function randBetween(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function randInt(a: number, b: number): number {
  return Math.floor(randBetween(a, b + 1));
}

function normalSample(mean: number, std: number): number {
  // Box-Muller
  const u1 = Math.random(), u2 = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function bearingTo(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const lat1R = lat1 * Math.PI / 180;
  const lat2R = lat2 * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2R);
  const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function angleDiff(a: number, b: number): number {
  let d = (b - a + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

function weightedRandom<T>(items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r <= 0) return item;
  }
  return items[items.length - 1][0];
}

function pickRouteForType(type: VesselType): Route | null {
  const arch = ARCHETYPES[type];
  const eligible = ALL_ROUTES.filter(r => {
    if (arch.allowedRoutePrefixes.length === 0) return false;
    return r.vesselTypes.includes(type) || arch.allowedRoutePrefixes.some(p => r.id.startsWith(p));
  });
  if (eligible.length === 0) return null;
  // Weight by route frequency
  const weighted: [Route, number][] = eligible.map(r => [r, r.frequency]);
  return weightedRandom(weighted);
}

function pickFishingGround() {
  return FISHING_GROUNDS[randInt(0, FISHING_GROUNDS.length - 1)];
}

function randomPointInCircle(lat: number, lng: number, radiusKm: number): [number, number] {
  const r = radiusKm * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;
  return [
    lat + r * DEG_PER_KM * Math.cos(theta),
    lng + r * DEG_PER_KM * Math.sin(theta) / Math.cos(lat * Math.PI / 180),
  ];
}

function pickPortForType(type: VesselType): Port {
  // Fishing -> west/east coast only; naval -> specific bases; else any
  const eligible = type === 'fishing'
    ? INDIAN_PORTS.filter(p => p.coast !== 'island')
    : INDIAN_PORTS;
  return eligible[randInt(0, eligible.length - 1)];
}

function generateVesselId(): string {
  return `V${Math.floor(Math.random() * 1e6).toString().padStart(6, '0')}`;
}

function generateMmsi(type: VesselType): string {
  // Indian MMSI starts with 419
  const bad = Math.random() < 0.005; // 0.5% invalid MMSI for dark fleet testing
  if (bad) return `${randInt(100, 9999)}`;
  return `419${randInt(100000, 999999)}`;
}

function generateVesselName(type: VesselType, id: string): string {
  const suffixes: Record<VesselType, string[]> = {
    cargo: ['STAR', 'WAVE', 'INDIA', 'PRIDE', 'GLORY'],
    container: ['EXPRESS', 'LINE', 'ARROW', 'SWIFT', 'LINK'],
    bulk_carrier: ['BULK', 'CARRIER', 'TITAN', 'ATLAS', 'HEAVY'],
    tanker: ['PETRO', 'OIL', 'GULF', 'CRUDE', 'ENERGY'],
    fishing: ['MEENA', 'NEELAVENI', 'SEA BIRD', 'FISHER', 'NET'],
    passenger: ['VOYAGE', 'CRUISE', 'FERRY', 'ISLAND', 'JET'],
    naval_patrol: ['INS', 'VIKRAM', 'TABAR', 'SHAKTI'],
    coast_guard: ['ICGS', 'VEERA', 'SAMARTH', 'RAJVEER'],
    supply: ['SUPPLY', 'OFS', 'SERVICE', 'SUPPORT'],
    research: ['RV', 'SAGAR', 'POONAM', 'VIKRAM'],
    pilot_boat: ['PILOT', 'GUIDE', 'HARBOR', 'APPROACH'],
    tug: ['TUG', 'HERCULES', 'POWER', 'STRONG'],
    military: ['INS', 'DESTROYER', 'FRIGATE', 'VIKRANT'],
  };
  const nameList = suffixes[type];
  return `${nameList[randInt(0, nameList.length - 1)]}-${id.slice(-4)}`;
}

// ─── Vessel Factory ───────────────────────────────────────────────────────────

function spawnVessel(type: VesselType): ActiveVessel {
  const arch = ARCHETYPES[type];
  const homePort = pickPortForType(type);
  const route = pickRouteForType(type);

  let startLat = homePort.lat;
  let startLng = homePort.lng;
  let targetPort: Port | null = null;
  let fishingGround = null;
  let offshoreAsset = null;
  let targetWaypointIndex = 1;

  if (arch.behaviourMode === 'routing' && route) {
    startLat = route.waypoints[0][0] + (Math.random() - 0.5) * 0.1;
    startLng = route.waypoints[0][1] + (Math.random() - 0.5) * 0.1;
    // Find target port from last waypoint
    const last = route.waypoints[route.waypoints.length - 1];
    let closest: Port = INDIAN_PORTS[0];
    let minDist = Infinity;
    for (const p of INDIAN_PORTS) {
      const d = distKm(last[0], last[1], p.lat, p.lng);
      if (d < minDist) { minDist = d; closest = p; }
    }
    targetPort = closest;
  } else if (arch.behaviourMode === 'fishing') {
    fishingGround = pickFishingGround();
    const pt = randomPointInCircle(fishingGround.center[0], fishingGround.center[1], fishingGround.radiusKm * 0.8);
    startLat = pt[0];
    startLng = pt[1];
  } else if (arch.behaviourMode === 'supply_loop' && route) {
    startLat = route.waypoints[0][0];
    startLng = route.waypoints[0][1];
    // Find related offshore asset
    for (const asset of OFFSHORE_ASSETS) {
      if (route.id.includes('MH') && asset.id.includes('MH')) { offshoreAsset = asset; break; }
      if (route.id.includes('KGD6') && asset.id.includes('KGD6')) { offshoreAsset = asset; break; }
    }
    targetPort = homePort;
  } else if (arch.behaviourMode === 'patrol_loop') {
    // Start near home port
    startLat = homePort.lat + (Math.random() - 0.5) * 0.3;
    startLng = homePort.lng + (Math.random() - 0.5) * 0.3;
  }

  const id = generateVesselId();
  const initialHeading = Math.random() * 360;
  const initialSpeed = Math.max(arch.minSpeedKnots, normalSample(arch.normalSpeedKnots * 0.7, arch.normalSpeedKnots * 0.2));

  return {
    id,
    mmsi: generateMmsi(type),
    name: generateVesselName(type, id),
    lat: startLat,
    lng: startLng,
    type,
    heading: initialHeading,
    speed: initialSpeed,
    risk: 'low',
    timestamp: Date.now(),
    originPort: homePort.name,
    destinationPort: targetPort?.name,
    length: randBetween(arch.lengthRange[0], arch.lengthRange[1]),
    width: randBetween(arch.widthRange[0], arch.widthRange[1]),
    draft: randBetween(arch.draftRange[0], arch.draftRange[1]),
    navStatus: 'Under way',
    aisState: Math.random() < arch.aisReliability ? 'ON' : 'OFF',
    destination: targetPort?.name,

    // Internal state
    archetype: arch,
    route,
    targetWaypointIndex,
    homePort,
    targetPort,
    fishingGround,
    offshoreAsset,
    aisStateTimer: randInt(30, 120),
    stationaryTimer: 0,
    targetHeading: initialHeading,
    speedKnots: initialSpeed,
    targetSpeedKnots: initialSpeed,
    gpsDrift: randBetween(0.00002, 0.0001),
    eventTimer: randInt(60, 600),
  };
}

// ─── Main Generator Class ─────────────────────────────────────────────────────

export class SyntheticAISGenerator {
  private vessels: ActiveVessel[] = [];
  private onMessageCallback?: (messages: AISMessage[]) => void;
  private timer: NodeJS.Timeout | null = null;
  private batchSize: number;
  private tickRateMs: number;
  private maxVessels: number;
  private tick_count = 0;

  constructor(vesselCount = 500, batchSize = 100, tickRateMs = 1000) {
    this.maxVessels = vesselCount;
    this.batchSize = batchSize;
    this.tickRateMs = tickRateMs;
    this.replenishFleet();
  }

  private replenishFleet() {
    while (this.vessels.length < this.maxVessels) {
      const type = weightedRandom(FLEET_COMPOSITION);
      this.vessels.push(spawnVessel(type));
    }
  }

  public setCallback(cb: (messages: AISMessage[]) => void) {
    this.onMessageCallback = cb;
  }

  public start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.tickRateMs);
  }

  public stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  // ── Simulation Controls (for UI-triggered events) ──────────────────────────

  public corruptRandomVesselMmsi() {
    if (this.vessels.length > 0) {
      const v = this.vessels[randInt(0, this.vessels.length - 1)];
      v.mmsi = `${randInt(100, 9999)}`; // Bad MMSI
    }
  }

  public spawnRendezvous() {
    if (this.vessels.length >= 2) {
      const v1 = this.vessels[0];
      const v2 = this.vessels[1];
      v2.lat = v1.lat + 0.005;
      v2.lng = v1.lng + 0.005;
      v2.targetSpeedKnots = 0;
      v1.targetSpeedKnots = 0;
    }
  }

  public forceStopRandomVessel() {
    const v = this.vessels[randInt(0, this.vessels.length - 1)];
    v.targetSpeedKnots = 0;
    v.stationaryTimer = randInt(30, 90);
    v.navStatus = 'At anchor';
  }

  public triggerRapidHeadingChange() {
    const v = this.vessels[randInt(0, this.vessels.length - 1)];
    v.targetHeading = (v.heading + 150 + Math.random() * 60) % 360;
  }

  // ── Main Tick ─────────────────────────────────────────────────────────────

  private tick() {
    this.tick_count++;
    const now = Date.now();
    const dtSec = (this.tickRateMs / 1000) * SIM_SPEED_MULTIPLIER;

    for (let i = this.vessels.length - 1; i >= 0; i--) {
      const v = this.vessels[i];
      if (!this.updateVessel(v, now, dtSec)) {
        // Vessel completed its journey - replace with new vessel
        this.vessels[i] = spawnVessel(weightedRandom(FLEET_COMPOSITION));
      }
    }

    this.replenishFleet();
    this.emitBatch(now);
  }

  private updateVessel(v: ActiveVessel, now: number, dtSec: number): boolean {
    const arch = v.archetype;

    // ── AIS State toggle (off hot path - only ~every 30-120 ticks) ───────────
    v.aisStateTimer--;
    if (v.aisStateTimer <= 0) {
      if (Math.random() < arch.aisReliability) {
        v.aisState = 'ON';
      } else {
        v.aisState = Math.random() < 0.5 ? 'OFF' : 'INTERMITTENT';
      }
      v.aisStateTimer = randInt(30, 120);
    }

    // ── Autonomous event scheduler ──────────────────────────────────────────
    v.eventTimer--;
    if (v.eventTimer <= 0) {
      this.triggerAutonomousEvent(v);
      v.eventTimer = randInt(120, 900);
    }

    // ── Stationary timer (fishing stop, port waiting) ──────────────────────
    if (v.stationaryTimer > 0) {
      v.stationaryTimer--;
      v.targetSpeedKnots = 0;
    }

    // ── Behaviour-specific movement logic ──────────────────────────────────
    switch (arch.behaviourMode) {
      case 'routing':
        if (!this.updateRouting(v, dtSec)) return false;
        break;
      case 'fishing':
        this.updateFishing(v, dtSec);
        break;
      case 'supply_loop':
        if (!this.updateRouting(v, dtSec)) return false; // supply loops are route-based
        break;
      case 'patrol_loop':
        this.updatePatrol(v, dtSec);
        break;
      case 'anchored':
        // Stays still
        v.targetSpeedKnots = 0;
        break;
    }

    // ── Kinematic updates ─────────────────────────────────────────────────
    // 1. Smooth heading change (gradual turn)
    const headingDelta = angleDiff(v.heading, v.targetHeading);
    const maxTurn = arch.turnRateDegPerSec * dtSec;
    if (Math.abs(headingDelta) < maxTurn) {
      v.heading = v.targetHeading;
    } else {
      v.heading = (v.heading + Math.sign(headingDelta) * maxTurn + 360) % 360;
    }

    // 2. Smooth speed change (acceleration)
    const speedDelta = v.targetSpeedKnots - v.speedKnots;
    const maxAcc = arch.accelerationKnotsPerSec * dtSec;
    if (Math.abs(speedDelta) < maxAcc) {
      v.speedKnots = v.targetSpeedKnots;
    } else {
      v.speedKnots += Math.sign(speedDelta) * maxAcc;
    }
    v.speed = Math.max(0, Math.min(arch.maxSpeedKnots, v.speedKnots));

    // 3. Move vessel
    if (v.speed > 0) {
      const distKmStep = v.speed * KNOTS_TO_KM_PER_SEC * dtSec;
      const headingRad = v.heading * Math.PI / 180;
      v.lat += distKmStep * Math.cos(headingRad) * DEG_PER_KM;
      v.lng += distKmStep * Math.sin(headingRad) * DEG_PER_KM / Math.cos(v.lat * Math.PI / 180);
    }

    // 4. Apply GPS noise
    v.lat += (Math.random() - 0.5) * v.gpsDrift;
    v.lng += (Math.random() - 0.5) * v.gpsDrift;

    // Wrap / clamp to valid Indian ocean range
    if (v.lat < -5 || v.lat > 30 || v.lng < 60 || v.lng > 110) {
      return false; // Out of range, respawn
    }

    v.timestamp = now;
    return true;
  }

  private updateRouting(v: ActiveVessel, _dtSec: number): boolean {
    if (!v.route) return false;
    const waypoints = v.route.waypoints;

    if (v.targetWaypointIndex >= waypoints.length) {
      return false; // Journey complete
    }

    const target = waypoints[v.targetWaypointIndex];
    const d = distKm(v.lat, v.lng, target[0], target[1]);

    if (d < 2) { // Within 2km, advance waypoint
      v.targetWaypointIndex++;
      if (v.targetWaypointIndex >= waypoints.length) return false;
    }

    // Steer towards target
    v.targetHeading = bearingTo(v.lat, v.lng, target[0], target[1]);
    v.targetSpeedKnots = v.archetype.normalSpeedKnots + normalSample(0, 1.5);
    v.targetSpeedKnots = Math.max(v.archetype.minSpeedKnots, Math.min(v.archetype.maxSpeedKnots, v.targetSpeedKnots));

    return true;
  }

  private updateFishing(v: ActiveVessel, dtSec: number) {
    if (!v.fishingGround) {
      v.fishingGround = pickFishingGround();
    }

    const fg = v.fishingGround;
    const d = distKm(v.lat, v.lng, fg.center[0], fg.center[1]);

    if (d > fg.radiusKm) {
      // Return to fishing ground
      v.targetHeading = bearingTo(v.lat, v.lng, fg.center[0], fg.center[1]);
      v.targetSpeedKnots = v.archetype.normalSpeedKnots;
      return;
    }

    // Already inside fishing ground - realistic fishing behaviour
    if (v.stationaryTimer > 0) return; // Net hauling, stopped

    const r = Math.random();
    if (r < 0.002 * dtSec) {
      // Stop to haul nets
      v.targetSpeedKnots = 0;
      v.stationaryTimer = randInt(5, 30);
      v.navStatus = 'Engaged in fishing';
    } else if (r < 0.005 * dtSec) {
      // Change heading randomly
      v.targetHeading = Math.random() * 360;
      v.targetSpeedKnots = randBetween(1, v.archetype.normalSpeedKnots);
    } else if (r < 0.007 * dtSec) {
      // Return to port
      const port = v.homePort;
      v.targetHeading = bearingTo(v.lat, v.lng, port.lat, port.lng);
      v.targetSpeedKnots = v.archetype.maxSpeedKnots;
    }
  }

  private updatePatrol(v: ActiveVessel, _dtSec: number) {
    // Orbit home port at radius of 5-20km
    const port = v.homePort;
    const d = distKm(v.lat, v.lng, port.lat, port.lng);
    const patrolRadius = 15;

    if (d > patrolRadius * 1.5) {
      // Too far - return
      v.targetHeading = bearingTo(v.lat, v.lng, port.lat, port.lng);
      v.targetSpeedKnots = v.archetype.normalSpeedKnots;
    } else {
      // Orbit: steer perpendicular to radial vector
      const bear = bearingTo(v.lat, v.lng, port.lat, port.lng);
      v.targetHeading = (bear + 90) % 360; // tangent to orbit circle
      v.targetSpeedKnots = v.archetype.normalSpeedKnots;
    }
  }

  private triggerAutonomousEvent(v: ActiveVessel) {
    const r = Math.random();

    if (v.type === 'fishing' && r < 0.05) {
      // Illegal fishing zone intrusion - move towards restricted area edge
      v.targetHeading = bearingTo(v.lat, v.lng, 8.9288, 78.6797); // Gulf of Mannar
    } else if ((v.type === 'cargo' || v.type === 'tanker') && r < 0.02) {
      // AIS off for dark fleet simulation
      v.aisState = 'OFF';
      v.aisStateTimer = randInt(20, 60);
    } else if (r < 0.01) {
      // Loitering - come to stop
      v.targetSpeedKnots = 0;
      v.stationaryTimer = randInt(10, 50);
    }
  }

  // ── Emit Batch ──────────────────────────────────────────────────────────────

  private emitBatch(now: number) {
    if (!this.onMessageCallback) return;

    // Only emit vessels with AIS on
    const visible = this.vessels.filter(v => v.aisState !== 'OFF');

    const outgoing: AISMessage[] = visible.map(v => ({
      id: v.id,
      mmsi: v.mmsi,
      name: v.name,
      lat: v.lat,
      lng: v.lng,
      type: v.type,
      heading: v.heading,
      speed: v.speed,
      risk: v.risk,
      riskScore: v.riskScore,
      timestamp: now,
      originPort: v.originPort,
      destinationPort: v.destinationPort,
      length: v.length,
      width: v.width,
      draft: v.draft,
      navStatus: v.navStatus,
      aisState: v.aisState,
      destination: v.destination,
    }));

    for (let i = 0; i < outgoing.length; i += this.batchSize) {
      this.onMessageCallback(outgoing.slice(i, i + this.batchSize));
    }
  }
}
