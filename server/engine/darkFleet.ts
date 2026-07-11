import { AISMessage } from './generator';
import { Alert } from './geofence';
import { H3Engine } from './h3';

export class DarkFleetEngine {
  private lastSeen: Map<string, number>;
  private lastKnownCell: Map<string, string>;
  private activeAlerts: Map<string, Alert>;
  private dropOffThresholdMs: number;
  private h3Engine: H3Engine;
  private lastSweepTime: number = 0;
  private sweepIntervalMs: number = 10000;

  constructor(h3Engine: H3Engine, dropOffThresholdMs: number = 15000) {
    this.h3Engine = h3Engine;
    this.lastSeen = new Map<string, number>();
    this.lastKnownCell = new Map<string, string>();
    this.activeAlerts = new Map<string, Alert>();
    this.dropOffThresholdMs = dropOffThresholdMs;
  }

  public processBatch(messages: AISMessage[]): Alert[] {
    const alerts: Alert[] = [];
    const now = Date.now();

    for (const msg of messages) {
      this.lastSeen.set(msg.id, msg.timestamp);
      this.lastKnownCell.set(msg.id, this.h3Engine.getCell(msg.lat, msg.lng));
      
      // Rule 1: Invalid or suspicious MMSI
      if (!msg.mmsi || msg.mmsi.length < 9) {
        if (!this.activeAlerts.has(msg.id)) {
          const alert = this.createAlert(msg, 'Invalid MMSI detected', 'HIGH');
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

    // Rule 2: AIS Drop off Sweep (off hot path)
    if (now - this.lastSweepTime > this.sweepIntervalMs) {
      this.performSweep(now, alerts);
      this.lastSweepTime = now;
    }

    return alerts;
  }

  private performSweep(now: number, alerts: Alert[]) {
    for (const [vesselId, timestamp] of this.lastSeen.entries()) {
      if (now - timestamp > this.dropOffThresholdMs) {
        if (!this.activeAlerts.has(vesselId)) {
          const cellId = this.lastKnownCell.get(vesselId) || 'Unknown';
          // Escalate severity if near protected zone
          const isNearProtected = cellId !== 'Unknown' && this.isNearProtectedZone(cellId);
          const severity = isNearProtected ? 'CRITICAL' : 'HIGH';

          const alert: Alert = {
            id: `DF-${now}-${vesselId}`,
            type: 'Dark Fleet',
            vesselId: vesselId,
            vesselName: `Unknown-${vesselId}`, 
            timestamp: now,
            severity: severity,
            location: cellId,
            metadata: { reason: 'AIS Signal Lost', isNearProtected },
            status: 'ACTIVE'
          };
          alerts.push(alert);
          this.activeAlerts.set(vesselId, alert);
        }
      } else {
        if (this.activeAlerts.has(vesselId) && this.activeAlerts.get(vesselId)!.metadata.reason === 'AIS Signal Lost') {
          const alert = this.activeAlerts.get(vesselId)!;
          alert.status = 'RESOLVED';
          alert.timestamp = now;
          alerts.push(alert);
          this.activeAlerts.delete(vesselId);
        }
      }
    }
  }

  private isNearProtectedZone(cellId: string): boolean {
    if (this.h3Engine.isGeofenced(cellId)) return true;
    const neighbors = this.h3Engine.getDisk(cellId, 1);
    for (const neighbor of neighbors) {
      if (this.h3Engine.isGeofenced(neighbor)) return true;
    }
    return false;
  }

  private createAlert(msg: AISMessage, reason: string, severity: 'CRITICAL'|'HIGH'|'WARNING'|'INFO'): Alert {
    return {
      id: `DF-${Date.now()}-${msg.id}`,
      type: 'Dark Fleet',
      vesselId: msg.id,
      vesselName: msg.name,
      timestamp: Date.now(),
      severity: severity,
      location: this.h3Engine.getCell(msg.lat, msg.lng),
      metadata: { reason, lat: msg.lat, lng: msg.lng },
      status: 'ACTIVE'
    };
  }
}
