import { AISMessage } from './generator';
import { Alert } from './geofence';
import { H3Engine } from './h3';
import { INDIAN_ECOLOGICAL_ZONES, isInsideRegion } from '../data/indian_coast';

export class EcologicalZoneEngine {
  private h3Engine: H3Engine;
  private activeAlerts: Map<string, Alert>;

  constructor(h3Engine: H3Engine) {
    this.h3Engine = h3Engine;
    this.activeAlerts = new Map<string, Alert>();
  }

  public processBatch(messages: AISMessage[]): Alert[] {
    const alerts: Alert[] = [];
    const now = Date.now();

    for (const msg of messages) {
      let inZone = false;
      let violatedZone = null;

      for (const zone of INDIAN_ECOLOGICAL_ZONES) {
        if (isInsideRegion(msg.lat, msg.lng, zone)) {
          inZone = true;
          // Rule: Real-time speed check
          if (msg.speed > zone.maxSpeedKnots) {
            violatedZone = zone;
            break;
          }
        }
      }

      if (violatedZone) {
        if (!this.activeAlerts.has(msg.id)) {
          const alert: Alert = {
            id: `ECO-${now}-${msg.id}`,
            type: 'Ecological Zone Speed Violation',
            vesselId: msg.id,
            vesselName: msg.name,
            timestamp: now,
            severity: 'CRITICAL', // High severity for ecological violations
            location: this.h3Engine.getCell(msg.lat, msg.lng),
            metadata: {
              zoneName: violatedZone.name,
              maxSpeed: violatedZone.maxSpeedKnots,
              currentSpeed: msg.speed,
              lat: msg.lat,
              lng: msg.lng
            },
            status: 'ACTIVE'
          };
          alerts.push(alert);
          this.activeAlerts.set(msg.id, alert);
        }
      } else {
        // If they leave the zone or reduce speed, we remove them from alerted set
        // so they can be alerted again if they speed up.
        if (this.activeAlerts.has(msg.id)) {
          const alert = this.activeAlerts.get(msg.id)!;
          alert.status = 'RESOLVED';
          alert.timestamp = now;
          alerts.push(alert);
          this.activeAlerts.delete(msg.id);
        }
      }
    }

    return alerts;
  }
}
