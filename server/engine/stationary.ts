import { AISMessage } from './generator';
import { Alert } from './geofence';
import { H3Engine } from './h3';
import { INDIAN_PORTS, isInsideRegion } from '../data/indian_coast';

interface VesselState {
  firstSeenTimestamp: number;
  lastCell: string;
}

export class StationaryVesselEngine {
  private h3Engine: H3Engine;
  private vesselStates: Map<string, VesselState>;
  private activeAlerts: Map<string, Alert>;
  private thresholdMs: number;

  // Let's use 60 seconds as the stationary threshold for simulation purposes
  constructor(h3Engine: H3Engine, thresholdMs: number = 60000) {
    this.h3Engine = h3Engine;
    this.vesselStates = new Map<string, VesselState>();
    this.activeAlerts = new Map<string, Alert>();
    this.thresholdMs = thresholdMs;
  }

  public processBatch(messages: AISMessage[]): Alert[] {
    const alerts: Alert[] = [];
    const now = Date.now();

    for (const msg of messages) {
      const cell = this.h3Engine.getCell(msg.lat, msg.lng);
      
      const state = this.vesselStates.get(msg.id);
      
      if (!state || state.lastCell !== cell || msg.speed > 1.0) {
        // Vessel moved to a new cell, or is actively moving (speed > 1 knot), or first time seen
        this.vesselStates.set(msg.id, {
          firstSeenTimestamp: msg.timestamp,
          lastCell: cell
        });
        if (this.activeAlerts.has(msg.id)) {
          const alert = this.activeAlerts.get(msg.id)!;
          alert.status = 'RESOLVED';
          alert.timestamp = now;
          alerts.push(alert);
          this.activeAlerts.delete(msg.id);
        }
      } else {
        // Still in the same cell and practically stationary (speed <= 1.0)
        const duration = msg.timestamp - state.firstSeenTimestamp;
        
        if (duration >= this.thresholdMs && !this.activeAlerts.has(msg.id)) {
          // It's been stationary for too long, check if it's in an approved port
          let inPort = false;
          for (const port of INDIAN_PORTS) {
            if (isInsideRegion(msg.lat, msg.lng, port)) {
              inPort = true;
              break;
            }
          }

          if (!inPort) {
            const alert: Alert = {
              id: `SV-${now}-${msg.id}`,
              type: 'Stationary Vessel',
              vesselId: msg.id,
              vesselName: msg.name,
              timestamp: now,
              severity: 'WARNING',
              location: cell,
              metadata: { 
                duration, 
                lat: msg.lat, 
                lng: msg.lng 
              },
              status: 'ACTIVE'
            };
            alerts.push(alert);
            this.activeAlerts.set(msg.id, alert);
          }
        }
      }
    }

    return alerts;
  }
}
