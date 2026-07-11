import isSea from 'is-sea';
// Note: isSea is a direct function: isSea(lat, lng) => boolean
import { MARITIME_ROUTES, Route } from '../data/routes';

export type VesselType = 'cargo' | 'tanker' | 'passenger' | 'fishing' | 'patrol' | 'research' | 'tug' | 'military';

export interface AISMessage {
  id: string;
  mmsi: string;
  name: string;
  lat: number;
  lng: number;
  type: VesselType;
  heading: number;
  speed: number;
  risk: 'low' | 'high';
  timestamp: number;
  originPort?: string;
  destinationPort?: string;
}

const VESSEL_TYPES: VesselType[] = ['cargo', 'tanker', 'passenger', 'fishing', 'patrol', 'research', 'tug', 'military'];

interface ActiveVessel extends AISMessage {
  route: Route;
  targetWaypointIndex: number;
  originPort: string;
  destinationPort: string;
}

export class SyntheticAISGenerator {
  private vessels: ActiveVessel[] = [];
  private onMessageCallback?: (messages: AISMessage[]) => void;
  private timer: NodeJS.Timeout | null = null;
  private batchSize: number;
  private tickRateMs: number;
  private maxVessels: number;

  constructor(vesselCount: number = 1000, batchSize: number = 1000, tickRateMs: number = 1000) {
    this.maxVessels = vesselCount;
    this.batchSize = batchSize;
    this.tickRateMs = tickRateMs;
    this.replenishVessels();
  }

  private generateRandomVessel(): ActiveVessel {
    const route = MARITIME_ROUTES[Math.floor(Math.random() * MARITIME_ROUTES.length)];
    const startWaypoint = route.waypoints[0];
    
    // Add small jitter to avoid all ships being on exactly the same pixel
    const jitterLat = (Math.random() - 0.5) * 0.05;
    const jitterLng = (Math.random() - 0.5) * 0.05;
    
    let initialLat = startWaypoint[0] + jitterLat;
    let initialLng = startWaypoint[1] + jitterLng;

    // Step 2: Water Validation
    // Ensure the initial coordinate is actually in the sea
    let attempts = 0;
    while (!isSea(initialLat, initialLng) && attempts < 10) {
      initialLat = startWaypoint[0] + (Math.random() - 0.5) * 0.05;
      initialLng = startWaypoint[1] + (Math.random() - 0.5) * 0.05;
      attempts++;
    }

    // If we couldn't find a sea point after 10 attempts, just use exact waypoint (which should be sea)
    if (!isSea(initialLat, initialLng)) {
      initialLat = startWaypoint[0];
      initialLng = startWaypoint[1];
    }

    return {
      id: `V${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
      mmsi: Math.floor(100000000 + Math.random() * 900000000).toString(),
      name: `VESSEL-IND-${Math.floor(Math.random() * 10000)}`,
      lat: initialLat,
      lng: initialLng,
      type: VESSEL_TYPES[Math.floor(Math.random() * VESSEL_TYPES.length)],
      heading: 0,
      speed: Math.random() * 15 + 5, // 5 to 20 knots
      risk: Math.random() > 0.98 ? 'high' : 'low',
      timestamp: Date.now(),
      route: route,
      targetWaypointIndex: 1,
      originPort: route.name.split(' to ')[0],
      destinationPort: route.name.split(' to ')[1]
    };
  }

  private replenishVessels() {
    while (this.vessels.length < this.maxVessels) {
      this.vessels.push(this.generateRandomVessel());
    }
  }

  public setCallback(cb: (messages: AISMessage[]) => void) {
    this.onMessageCallback = cb;
  }

  public start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick();
    }, this.tickRateMs);
  }

  public corruptRandomVesselMmsi() {
    if (this.vessels.length > 0) {
      const idx = Math.floor(Math.random() * this.vessels.length);
      this.vessels[idx].mmsi = '1234'; // Invalid MMSI to trigger Dark Fleet alert
    }
  }

  public spawnRendezvous() {
    if (this.vessels.length >= 2) {
      // Force two random vessels to move to the same coordinates
      const v1 = this.vessels[0];
      const v2 = this.vessels[1];
      const rendezvousLat = v1.lat + 0.05;
      const rendezvousLng = v1.lng + 0.05;
      v1.lat = rendezvousLat;
      v1.lng = rendezvousLng;
      v2.lat = rendezvousLat;
      v2.lng = rendezvousLng;
      v1.speed = 0;
      v2.speed = 0;
    }
  }

  public forceStopRandomVessel() {
    if (this.vessels.length > 0) {
      const idx = Math.floor(Math.random() * this.vessels.length);
      this.vessels[idx].speed = 0; // Trigger Stationary Alert
    }
  }

  public triggerRapidHeadingChange() {
    if (this.vessels.length > 0) {
      const idx = Math.floor(Math.random() * this.vessels.length);
      // Change heading drastically
      this.vessels[idx].heading = (this.vessels[idx].heading + 180) % 360; 
    }
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick() {
    const now = Date.now();
    const dtHours = this.tickRateMs / 3600000; // time delta in hours for speed calc (knots)
    
    // Roughly 1 knot = 1.852 km/h. 
    // 1 degree of latitude is ~111km.
    // So 1 knot is ~0.0166 degrees/hour.
    const degPerHourPerKnot = 0.0166;

    for (let i = this.vessels.length - 1; i >= 0; i--) {
      const v = this.vessels[i];
      const target = v.route.waypoints[v.targetWaypointIndex];
      
      const targetLat = target[0];
      const targetLng = target[1];
      
      const dLat = targetLat - v.lat;
      const dLng = targetLng - v.lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      
      // If we've reached the target waypoint
      if (dist < 0.05) { // roughly 5km
        v.targetWaypointIndex++;
        
        // If reached final destination, remove vessel (Step 1 requirement)
        if (v.targetWaypointIndex >= v.route.waypoints.length) {
          this.vessels.splice(i, 1);
          continue;
        }
      } else {
        // Interpolate position towards target
        const headingRad = Math.atan2(dLng, dLat); // angle from North
        v.heading = (headingRad * 180 / Math.PI + 360) % 360; // Step 1: Rotate according to heading
        
        // Calculate step size in degrees
        const moveDist = v.speed * degPerHourPerKnot * (this.tickRateMs / 1000); // Scale by tick size (e.g. 1 sec)
        // Note: For realism we often speed up simulation, so we multiplier moveDist if needed.
        // Let's add a 100x multiplier to see movement in UI.
        const simulatedMoveDist = moveDist * 100;
        
        const nextLat = v.lat + Math.cos(headingRad) * simulatedMoveDist;
        const nextLng = v.lng + Math.sin(headingRad) * simulatedMoveDist;

        // Step 2: Water Validation Check
        if (isSea(nextLat, nextLng)) {
          v.lat = nextLat;
          v.lng = nextLng;
        } else {
          // It hit land, in a real simulation we'd pathfind around.
          // For now, if we hit land directly in front, we still just snap towards target slightly or ignore.
          // Since our waypoints are in sea, interpolating straight lines usually stays in sea,
          // but if it cuts a corner, we might get stuck. 
          // We'll just advance to next waypoint if stuck.
          v.targetWaypointIndex++;
          if (v.targetWaypointIndex >= v.route.waypoints.length) {
            this.vessels.splice(i, 1);
            continue;
          }
        }
      }
      
      v.timestamp = now;
    }

    // Replenish vessels that reached destinations
    this.replenishVessels();

    if (this.onMessageCallback) {
      // Map ActiveVessel back to AISMessage (omitting internal route state for the network)
      const outgoingMessages = this.vessels.map(v => ({
        id: v.id,
        mmsi: v.mmsi,
        name: v.name,
        lat: v.lat,
        lng: v.lng,
        type: v.type,
        heading: v.heading,
        speed: v.speed,
        risk: v.risk,
        timestamp: v.timestamp,
        originPort: v.originPort,
        destinationPort: v.destinationPort
      }));

      // Send in batches
      for (let i = 0; i < outgoingMessages.length; i += this.batchSize) {
        this.onMessageCallback(outgoingMessages.slice(i, i + this.batchSize));
      }
    }
  }
}
