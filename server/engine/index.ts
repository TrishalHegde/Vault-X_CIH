import { SyntheticAISGenerator, AISMessage } from './generator';
import { H3Engine } from './h3';
import { GeofenceEngine, Alert } from './geofence';
import { DynamicGeofenceManager } from './dynamicGeofence';
import { DarkFleetEngine } from './darkFleet';
import { StationaryVesselEngine } from './stationary';
import { RedirectionEngine } from './redirection';
import { EcologicalZoneEngine } from './ecological';
import { RendezvousEngine } from './rendezvous';
import { RiskScoringEngine } from './riskScoring';
import { ALL_RESTRICTED_ZONES, GREY_ZONES } from '../data/zones';
import { latLngToCell, gridDisk } from 'h3-js';
import { WebSocketServer, WebSocket } from 'ws';

const H3_RESOLUTION = 5; // coarser resolution covers MPAs well without too many cells

function seedRestrictedZonesIntoH3(h3Engine: H3Engine) {
  let totalSeeded = 0;
  for (const zone of ALL_RESTRICTED_ZONES) {
    const centerCell = latLngToCell(zone.center[0], zone.center[1], H3_RESOLUTION);
    // Fill a disk of cells to cover the zone radius
    const ringsNeeded = Math.ceil(zone.radiusKm / 8.5); // ~8.5km per ring at res 5
    const cells = gridDisk(centerCell, ringsNeeded);
    for (const cell of cells) {
      h3Engine.addGeofencedCell(cell);
      totalSeeded++;
    }
  }
  // Also seed grey zones with a different tier tag (we track via radius comparison)
  for (const zone of GREY_ZONES) {
    if (zone.type === 'grey_buffer') {
      const centerCell = latLngToCell(zone.center[0], zone.center[1], H3_RESOLUTION);
      const ringsNeeded = Math.ceil(zone.radiusKm / 8.5);
      const cells = gridDisk(centerCell, ringsNeeded);
      for (const cell of cells) {
        h3Engine.addGeofencedCell(cell);
        totalSeeded++;
      }
    }
  }
  console.log(`[Zones] Seeded ${totalSeeded} H3 cells (res ${H3_RESOLUTION}) from ${ALL_RESTRICTED_ZONES.length} restricted zones`);
}

export class EngineCoordinator {
  private generator: SyntheticAISGenerator;
  private h3Engine: H3Engine;
  private geofenceEngine: GeofenceEngine;
  public dynamicGeofences: DynamicGeofenceManager;
  private darkFleetEngine: DarkFleetEngine;
  private stationaryEngine: StationaryVesselEngine;
  private redirectionEngine: RedirectionEngine;
  private ecologicalEngine: EcologicalZoneEngine;
  private rendezvousEngine: RendezvousEngine;
  private riskScoringEngine: RiskScoringEngine;
  
  private wss: WebSocketServer;
  private activeThreats: number = 0;
  private msgProcessed: number = 0;
  private startTime: number;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.h3Engine = new H3Engine();
    
    // Seed H3 engine from MPA + Naval zones defined in zones.ts
    seedRestrictedZonesIntoH3(this.h3Engine);
    
    // Dynamic geofences (user-created at runtime via API)
    this.dynamicGeofences = new DynamicGeofenceManager(this.h3Engine);

    this.geofenceEngine = new GeofenceEngine(this.h3Engine);
    this.darkFleetEngine = new DarkFleetEngine(this.h3Engine);
    this.stationaryEngine = new StationaryVesselEngine(this.h3Engine);
    this.redirectionEngine = new RedirectionEngine(this.h3Engine);
    this.ecologicalEngine = new EcologicalZoneEngine(this.h3Engine);
    this.rendezvousEngine = new RendezvousEngine(this.h3Engine);
    this.riskScoringEngine = new RiskScoringEngine();

    // 800 vessels, batch size 100, 1s real-time tick
    this.generator = new SyntheticAISGenerator(800, 100, 1000);
    
    this.startTime = Date.now();
    this.generator.setCallback(this.onBatchProcessed.bind(this));
  }

  public start() {
    this.generator.start();
  }

  public corruptRandomVesselMmsi() {
    this.generator.corruptRandomVesselMmsi();
  }

  public spawnRendezvous() {
    this.generator.spawnRendezvous();
  }

  public forceStopRandomVessel() {
    this.generator.forceStopRandomVessel();
  }

  public triggerRapidHeadingChange() {
    this.generator.triggerRapidHeadingChange();
  }

  private onBatchProcessed(messages: AISMessage[]) {
    const startProcessTime = performance.now();
    
    // Hot Path
    let alerts: Alert[] = [];
    
    alerts.push(...this.geofenceEngine.processBatch(messages));
    alerts.push(...this.darkFleetEngine.processBatch(messages));
    alerts.push(...this.stationaryEngine.processBatch(messages));
    alerts.push(...this.redirectionEngine.processBatch(messages));
    alerts.push(...this.ecologicalEngine.processBatch(messages));
    alerts.push(...this.rendezvousEngine.processBatch(messages));
    
    this.msgProcessed += messages.length;
    
    // Calculate active threats (just unique alert counts currently active)
    this.activeThreats = alerts.filter(a => a.status === 'ACTIVE').length;

    // Apply risk scoring
    const enrichedMessages = messages.map(msg => {
      const { score, severity } = this.riskScoringEngine.calculateRisk(msg, alerts);
      return {
        ...msg,
        riskScore: score,
        risk: severity.toLowerCase()
      };
    });

    const endProcessTime = performance.now();
    const latency = endProcessTime - startProcessTime;
    
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const msgPerSec = Math.floor(this.msgProcessed / (uptime || 1));

    const payload = {
      type: 'engine_update',
      vessels: enrichedMessages,
      alerts: alerts,
      stats: {
        totalTracked: 500, // Hardcoded generator size
        msgProcessed: this.msgProcessed,
        activeThreats: this.activeThreats,
        uptime: `${Math.floor(uptime / 60)}m ${uptime % 60}s`,
        msgPerSec: msgPerSec > 0 ? msgPerSec : messages.length,
        latency: latency
      },
      restrictedCells: this.h3Engine.getGeofencedCells()
    };

    const data = JSON.stringify(payload);
    
    // Broadcast via WS
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}
