import { AISMessage } from './generator';
import { Alert } from './geofence';
import { H3Engine } from './h3';

export class DarkFleetEngine {
  private lastSeen: Map<string, number>;
  private activeAlerts: Map<string, Alert>;
  private dropOffThresholdMs: number;
  private h3Engine: H3Engine;

  constructor(h3Engine: H3Engine, dropOffThresholdMs: number = 15000) {
    this.h3Engine = h3Engine;
    this.lastSeen = new Map<string, number>();
    this.activeAlerts = new Map<string, Alert>();
    this.dropOffThresholdMs = dropOffThresholdMs;
  }

  public processBatch(messages: AISMessage[]): Alert[] {
    const alerts: Alert[] = [];
    const now = Date.now();

    for (const msg of messages) {
      this.lastSeen.set(msg.id, msg.timestamp);
      
      // Rule 1: Invalid or suspicious MMSI (e.g. less than 9 digits for Indian coast rule)
      if (!msg.mmsi || msg.mmsi.length < 9) {
        if (!this.activeAlerts.has(msg.id)) {
          const alert = this.createAlert(msg, 'Invalid MMSI detected');
          alerts.push(alert);
          this.activeAlerts.set(msg.id, alert);
        }
      } else {
        if (this.activeAlerts.has(msg.id) && this.activeAlerts.get(msg.id)!.metadata.reason === 'Invalid MMSI detected') {
          const alert = this.activeAlerts.get(msg.id)!;
          alert.status = 'RESOLVED';
          alert.timestamp = now;
          alerts.push(alert);
          this.activeAlerts.delete(msg.id);
        }
      }
    }

    // Rule 2: AIS Drop off
    // We check the map for vessels not seen in `dropOffThresholdMs`
    for (const [vesselId, timestamp] of this.lastSeen.entries()) {
      if (now - timestamp > this.dropOffThresholdMs) {
        if (!this.activeAlerts.has(vesselId)) {
          const alert: Alert = {
            id: `DF-${now}-${vesselId}`,
            type: 'Dark Fleet',
            vesselId: vesselId,
            vesselName: `Unknown-${vesselId}`, // Since we only have ID in this loop
            timestamp: now,
            severity: 'CRITICAL',
            location: 'Unknown',
            metadata: { reason: 'AIS Signal Lost' },
            status: 'ACTIVE'
          };
          alerts.push(alert);
          this.activeAlerts.set(vesselId, alert);
        }
      } else {
        // If it came back online, remove from alerted so we can alert again if it drops
        if (this.activeAlerts.has(vesselId) && this.activeAlerts.get(vesselId)!.metadata.reason === 'AIS Signal Lost') {
          const alert = this.activeAlerts.get(vesselId)!;
          alert.status = 'RESOLVED';
          alert.timestamp = now;
          alerts.push(alert);
          this.activeAlerts.delete(vesselId);
        }
      }
    }

    return alerts;
  }

  private createAlert(msg: AISMessage, reason: string): Alert {
    return {
      id: `DF-${Date.now()}-${msg.id}`,
      type: 'Dark Fleet',
      vesselId: msg.id,
      vesselName: msg.name,
      timestamp: Date.now(),
      severity: 'CRITICAL',
      location: this.h3Engine.getCell(msg.lat, msg.lng),
      metadata: { reason, lat: msg.lat, lng: msg.lng },
      status: 'ACTIVE'
    };
  }
}
