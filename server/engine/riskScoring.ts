import { Alert } from './geofence';
import { AISMessage } from './generator';

export interface RiskScoreResult {
  score: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

export class RiskScoringEngine {
  public calculateRisk(vessel: AISMessage, activeAlerts: Alert[]): RiskScoreResult {
    let score = 0;
    
    // Basic vessel type risk
    if (vessel.type === 'military') score += 10;
    if (vessel.type === 'cargo' || vessel.type === 'tanker') score += 5;

    // Check alerts for this vessel
    const vesselAlerts = activeAlerts.filter(a => 
      a.status === 'ACTIVE' && 
      (a.vesselId === vessel.id || a.vesselId.includes(vessel.id))
    );

    for (const alert of vesselAlerts) {
      switch (alert.type) {
        case 'Geofence Violation':
          // Assuming Restricted for now
          score += 30;
          break;
        case 'Ecological Zone Speed Violation':
          score += 15;
          break;
        case 'Dark Fleet':
          score += 35;
          break;
        case 'Rendezvous':
          score += 30;
          break;
        case 'Stationary Vessel':
          score += 10;
          break;
        case 'Suspicious Redirection':
          score += 15;
          break;
      }
    }

    let severity: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
    if (score >= 81) severity = 'Critical';
    else if (score >= 51) severity = 'High';
    else if (score >= 21) severity = 'Medium';
    else severity = 'Low';

    return { score, severity };
  }
}
