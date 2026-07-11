import { SyntheticAISGenerator, AISMessage } from './generator';
import { H3Engine } from './h3';
import { GeofenceEngine, Alert } from './geofence';
import { DynamicGeofenceManager } from './dynamicGeofence';
import { DarkFleetEngine } from './darkFleet';
import { StationaryVesselEngine } from './stationary';
import { RedirectionEngine } from './redirection';
import { EcologicalZoneEngine } from './ecological';
import { WebSocketServer, WebSocket } from 'ws';

export class EngineCoordinator {
  private generator: SyntheticAISGenerator;
  private h3Engine: H3Engine;
  private geofenceEngine: GeofenceEngine;
  public dynamicGeofences: DynamicGeofenceManager;
  private darkFleetEngine: DarkFleetEngine;
  private stationaryEngine: StationaryVesselEngine;
  private redirectionEngine: RedirectionEngine;
  private ecologicalEngine: EcologicalZoneEngine;
  
  private wss: WebSocketServer;
  private activeThreats: number = 0;
  private msgProcessed: number = 0;
  private startTime: number;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.h3Engine = new H3Engine();
    
    // Add a hardcoded geofence for testing (e.g. around Mumbai port)
    this.dynamicGeofences = new DynamicGeofenceManager(this.h3Engine);
    this.dynamicGeofences.addGeofence('GF-TEST-MUMBAI', 18.9220, 72.8347, 2);

    this.geofenceEngine = new GeofenceEngine(this.h3Engine);
    this.darkFleetEngine = new DarkFleetEngine(this.h3Engine);
    this.stationaryEngine = new StationaryVesselEngine(this.h3Engine);
    this.redirectionEngine = new RedirectionEngine(this.h3Engine);
    this.ecologicalEngine = new EcologicalZoneEngine(this.h3Engine);

    this.generator = new SyntheticAISGenerator(500, 100, 1000); // 500 vessels, batch size 100, 1s tick
    
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
    
    this.msgProcessed += messages.length;
    
    // Calculate active threats (just unique alert counts currently active)
    this.activeThreats = alerts.length;

    const endProcessTime = performance.now();
    const latency = endProcessTime - startProcessTime;
    
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const msgPerSec = Math.floor(this.msgProcessed / (uptime || 1));

    const payload = {
      type: 'engine_update',
      vessels: messages, // Send the latest batch of vessels
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
