import { H3Engine } from './h3';
import { AISMessage } from './generator';

export interface Alert {
  id: string;
  type: 'Geofence Violation' | 'Dark Fleet' | 'Stationary Vessel' | 'Suspicious Redirection' | 'Ecological Zone Speed Violation';
  vesselId: string;
  vesselName: string;
  timestamp: number;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
  location: string;
  metadata?: any;
  status: 'ACTIVE' | 'RESOLVED';
}

export class GeofenceEngine {
  private activeAlerts = new Map<string, Alert>();

  constructor(h3Engine: H3Engine) {
    this.h3Engine = h3Engine;
  }

  /**
   * Process a batch of AIS messages for geofence violations.
   * Returns a list of generated alerts (ACTIVE or RESOLVED).
   */
  public processBatch(messages: AISMessage[]): Alert[] {
    const alerts: Alert[] = [];
    const now = Date.now();

    for (const msg of messages) {
      const cell = this.h3Engine.getCell(msg.lat, msg.lng);
      
      if (this.h3Engine.isGeofenced(cell)) {
        if (!this.activeAlerts.has(msg.id)) {
          const alert: Alert = {
            id: `GF-${now}-${msg.id}`,
            type: 'Geofence Violation',
            vesselId: msg.id,
            vesselName: msg.name,
            timestamp: now,
            severity: 'HIGH',
            location: cell,
            metadata: { lat: msg.lat, lng: msg.lng },
            status: 'ACTIVE'
          };
          this.activeAlerts.set(msg.id, alert);
          alerts.push(alert);
        }
      } else {
        if (this.activeAlerts.has(msg.id)) {
          const alert = this.activeAlerts.get(msg.id)!;
          alert.status = 'RESOLVED';
          alert.timestamp = now; // update timestamp for resolution
          alerts.push(alert);
          this.activeAlerts.delete(msg.id);
        }
      }
    }

    return alerts;
  }
}
