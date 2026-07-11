import { AISMessage } from './generator';
import { Alert } from './geofence';
import { H3Engine } from './h3';

interface HistoryState {
  heading: number;
  timestamp: number;
}

export class RedirectionEngine {
  private h3Engine: H3Engine;
  private history: Map<string, HistoryState>;
  private activeAlerts: Map<string, Alert>;
  private maxAngleDiff: number;
  private timeWindowMs: number;

  constructor(h3Engine: H3Engine, maxAngleDiff: number = 45, timeWindowMs: number = 30000) {
    this.h3Engine = h3Engine;
    this.history = new Map<string, HistoryState>();
    this.activeAlerts = new Map<string, Alert>();
    this.maxAngleDiff = maxAngleDiff;
    this.timeWindowMs = timeWindowMs; // We measure rate of change over a short window
  }

  public processBatch(messages: AISMessage[]): Alert[] {
    const alerts: Alert[] = [];
    const now = Date.now();

    for (const msg of messages) {
      const state = this.history.get(msg.id);
      
      if (!state) {
        this.history.set(msg.id, { heading: msg.heading, timestamp: msg.timestamp });
        continue;
      }

      // Check time difference
      const dt = msg.timestamp - state.timestamp;
      
      if (dt <= this.timeWindowMs && dt > 0) {
        let diff = Math.abs(msg.heading - state.heading);
        if (diff > 180) {
          diff = 360 - diff;
        }

        if (diff >= this.maxAngleDiff) {
          // Suspicious redirection detected (too sharp in a small timeframe)
          if (!this.activeAlerts.has(msg.id)) {
            const alert: Alert = {
              id: `RED-${now}-${msg.id}`,
              type: 'Suspicious Redirection',
              vesselId: msg.id,
              vesselName: msg.name,
              timestamp: now,
              severity: 'HIGH',
              location: this.h3Engine.getCell(msg.lat, msg.lng),
              metadata: { 
                oldHeading: state.heading, 
                newHeading: msg.heading, 
                angleDiff: diff,
                lat: msg.lat,
                lng: msg.lng
              },
              status: 'ACTIVE'
            };
            alerts.push(alert);
            this.activeAlerts.set(msg.id, alert);
          }
          
          // Reset state to avoid rapid re-triggering from the new heading
          this.history.set(msg.id, { heading: msg.heading, timestamp: msg.timestamp });
        } else {
          // Update normal history
          this.history.set(msg.id, { heading: msg.heading, timestamp: msg.timestamp });
          
          // If we had an active alert, auto-resolve it because the turn is done.
          if (this.activeAlerts.has(msg.id)) {
            const alert = this.activeAlerts.get(msg.id)!;
            alert.status = 'RESOLVED';
            alert.timestamp = now;
            alerts.push(alert);
            this.activeAlerts.delete(msg.id);
          }
        }
      } else if (dt > this.timeWindowMs) {
        // Just update, diff over a long time is natural
        this.history.set(msg.id, { heading: msg.heading, timestamp: msg.timestamp });
        
        // Auto-resolve any old alert
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
