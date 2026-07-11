import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { EngineCoordinator } from './engine';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simulation control routes
app.post('/api/simulation/dark-fleet', (req, res) => {
  coordinator.corruptRandomVesselMmsi();
  res.json({ status: 'triggered' });
});

app.post('/api/simulation/rendezvous', (req, res) => {
  coordinator.spawnRendezvous();
  res.json({ status: 'triggered' });
});

app.post('/api/simulation/force-stop', (req, res) => {
  coordinator.forceStopRandomVessel();
  res.json({ status: 'triggered' });
});

app.post('/api/simulation/rapid-heading', (req, res) => {
  coordinator.triggerRapidHeadingChange();
  res.json({ status: 'triggered' });
});

// Start the server
const server = app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});

// Attach WebSocket server
const wss = new WebSocketServer({ server });
const coordinator = new EngineCoordinator(wss);

// Start the simulation engine
coordinator.start();

export { app, server, wss, coordinator };
