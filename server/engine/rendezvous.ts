import { AISMessage } from './generator';
import { Alert } from './geofence';
import { H3Engine } from './h3';

interface CoLocationRecord {
  vessels: string[];
  startTime: number;
}

export class RendezvousEngine {
  private h3Engine: H3Engine;
  private vesselCell: Map<string, string>;
  private cellOccupancy: Map<string, Set<string>>;
  private coLocations: Map<string, CoLocationRecord>;
  private activeAlerts: Map<string, Alert>;
  
  private lastSweepTime: number = 0;
  private sweepIntervalMs: number = 10000; // 10 seconds
  private rendezvousThresholdMs: number = 30000; // 30 seconds for demo purposes

  constructor(h3Engine: H3Engine) {
    this.h3Engine = h3Engine;
    this.vesselCell = new Map<string, string>();
    this.cellOccupancy = new Map<string, Set<string>>();
    this.coLocations = new Map<string, CoLocationRecord>();
    this.activeAlerts = new Map<string, Alert>();
  }

  public processBatch(messages: AISMessage[]): Alert[] {
    const alerts: Alert[] = [];
    const now = Date.now();

    // Hot path update - O(1) per message
    for (const msg of messages) {
      const cell = this.h3Engine.getCell(msg.lat, msg.lng);
      const oldCell = this.vesselCell.get(msg.id);
      
      if (oldCell !== cell) {
        if (oldCell) {
          const oldOccupants = this.cellOccupancy.get(oldCell);
          if (oldOccupants) {
            oldOccupants.delete(msg.id);
            if (oldOccupants.size === 0) {
              this.cellOccupancy.delete(oldCell);
            }
          }
        }
        
        if (!this.cellOccupancy.has(cell)) {
          this.cellOccupancy.set(cell, new Set<string>());
        }
        this.cellOccupancy.get(cell)!.add(msg.id);
        this.vesselCell.set(msg.id, cell);
      }
    }

    // Periodic sweep - runs once every sweepIntervalMs
    if (now - this.lastSweepTime > this.sweepIntervalMs) {
      this.performSweep(now, alerts);
      this.lastSweepTime = now;
    }

    return alerts;
  }

  private performSweep(now: number, alerts: Alert[]) {
    // 1. Update coLocations
    for (const [cellId, occupants] of this.cellOccupancy.entries()) {
      if (occupants.size >= 2) {
        if (!this.coLocations.has(cellId)) {
          this.coLocations.set(cellId, {
            vessels: Array.from(occupants),
            startTime: now
          });
        } else {
          // Update the list of vessels if it changed
          this.coLocations.get(cellId)!.vessels = Array.from(occupants);
        }
      } else {
        if (this.coLocations.has(cellId)) {
          this.coLocations.delete(cellId);
        }
      }
    }

    // 2. Check duration and generate alerts
    const currentlyAlertingCells = new Set<string>();

    for (const [cellId, record] of this.coLocations.entries()) {
      if (now - record.startTime >= this.rendezvousThresholdMs) {
        currentlyAlertingCells.add(cellId);
        
        if (!this.activeAlerts.has(cellId)) {
          const alert: Alert = {
            id: `RDZ-${now}-${cellId}`,
            type: 'Rendezvous',
            vesselId: record.vessels.join(', '), // Store multiple vessels in vesselId for display
            vesselName: `Multiple Vessels`,
            timestamp: now,
            severity: 'CRITICAL',
            location: cellId,
            metadata: { reason: 'Ship-to-Ship Transfer Suspected', vessels: record.vessels },
            status: 'ACTIVE'
          };
          alerts.push(alert);
          this.activeAlerts.set(cellId, alert);
        }
      }
    }

    // 3. Resolve broken up rendezvous
    for (const [cellId, alert] of this.activeAlerts.entries()) {
      if (!currentlyAlertingCells.has(cellId)) {
        alert.status = 'RESOLVED';
        alert.timestamp = now;
        alerts.push(alert);
        this.activeAlerts.delete(cellId);
      }
    }
  }
}
