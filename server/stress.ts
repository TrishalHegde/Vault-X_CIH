import { SyntheticAISGenerator } from './engine/generator';
import { H3Engine } from './engine/h3';
import { GeofenceEngine } from './engine/geofence';
import { DarkFleetEngine } from './engine/darkFleet';
import { StationaryVesselEngine } from './engine/stationary';
import { RedirectionEngine } from './engine/redirection';
import { EcologicalZoneEngine } from './engine/ecological';

console.log('Initializing Maritime Surveillance Stress Test...');
console.log('Target Throughput: 50,000 messages / sec\n');

const h3Engine = new H3Engine();
const geofenceEngine = new GeofenceEngine(h3Engine);
const darkFleetEngine = new DarkFleetEngine(h3Engine);
const stationaryEngine = new StationaryVesselEngine(h3Engine);
const redirectionEngine = new RedirectionEngine(h3Engine);
const ecologicalEngine = new EcologicalZoneEngine(h3Engine);

// 50,000 vessels, batch size 50,000 to process in one massive chunk
const generator = new SyntheticAISGenerator(50000, 50000, 1000);

let totalProcessed = 0;
let lastReportTime = Date.now();

generator.setCallback((messages) => {
  const batchStart = performance.now();
  
  // Hot Path
  geofenceEngine.processBatch(messages);
  darkFleetEngine.processBatch(messages);
  stationaryEngine.processBatch(messages);
  redirectionEngine.processBatch(messages);
  ecologicalEngine.processBatch(messages);
  
  const batchEnd = performance.now();
  const latencyMs = batchEnd - batchStart;
  
  totalProcessed += messages.length;
  
  const now = Date.now();
  if (now - lastReportTime >= 1000) {
    console.log(`[STRESS METRICS] Throughput: ${totalProcessed.toLocaleString()} msg/sec | Latency for 50k: ${latencyMs.toFixed(2)}ms`);
    totalProcessed = 0;
    lastReportTime = now;
  }
});

console.log('Starting Generator with 50,000 continuous vessels...');
generator.start();
