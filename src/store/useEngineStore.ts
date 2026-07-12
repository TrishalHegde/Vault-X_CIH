import { create } from 'zustand';

export interface Vessel {
  id: string;
  mmsi: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  heading: number;
  speed: number;
  risk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  history: [number, number][];
}

export interface Incident {
  id: string;
  timestamp: string;
  vesselId: string;
  vesselName: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
  location: string;
  status: 'ACTIVE' | 'RESOLVED';
  zone?: string;
  detectionDetail?: string;
}

export interface LogEntry {
  timestamp: string;
  message: string;
}

export interface StressSnapshot {
  msgPerSec: number;
  timestamp: number;
}

const WS_URL = 'ws://localhost:3001/ws';
const API_BASE = 'http://localhost:3001';
const RECONNECT_DELAY_MS = 3000;

export { API_BASE };

interface EngineState {
  vessels: Vessel[];
  activeThreats: Incident[];
  threatHistory: Incident[];
  fishingAlerts: Incident[];
  logs: LogEntry[];
  wsConnected: boolean;
  stats: {
    totalTracked: number;
    msgProcessed: number;
    activeThreats: number;
    uptime: string;
    msgPerSec: number;
    latency: number;
    stressRunning: boolean;
    fishingAlerts: number;
  };
  simulation: { isRunning: boolean; speedMultiplier: number };
  settings: { showH3Grid: boolean };
  restrictedCells: string[];
  selectedVessel: string | null;
  // Stress test
  stressRunning: boolean;
  stressMsgPerSec: number;
  stressHistory: StressSnapshot[];
  stressTotal: number;
  actions: {
    initEngine: () => void;
    toggleSimulation: () => void;
    toggleH3Grid: () => void;
    tick: () => void;
    setSelectedVessel: (id: string | null) => void;
    triggerSimulation: (event: 'dark-fleet' | 'force-stop' | 'rapid-heading' | 'rendezvous') => Promise<void>;
    startStressTest: () => Promise<void>;
    stopStressTest: () => Promise<void>;
  };
}

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connectWs(set: (fn: (s: EngineState) => Partial<EngineState>) => void, get: () => EngineState) {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    set((state) => ({
      wsConnected: true,
      logs: [{ timestamp: new Date().toISOString(), message: '✅ Connected to Maritime Engine' }, ...state.logs].slice(0, 100),
    }));
  };

  ws.onmessage = (event) => {
    const state = get();

    try {
      const payload = JSON.parse(event.data as string);
      if (payload.type !== 'engine_update') return;

      const oldVesselsMap = new Map(state.vessels.map((v) => [v.id, v]));

      const newVessels: Vessel[] = (payload.vessels || []).map((v: Vessel) => {
        const oldV = oldVesselsMap.get(v.id);
        let history: [number, number][] = oldV ? [...oldV.history] : [];
        if (!oldV || oldV.lat !== v.lat || oldV.lng !== v.lng) {
          history.push([v.lat, v.lng]);
          if (history.length > 50) history.shift();
        }
        return { ...v, history };
      });

      const mapAlert = (a: Incident): Incident => ({
        id: a.id,
        timestamp: new Date(a.timestamp ?? Date.now()).toLocaleTimeString(),
        vesselId: a.vesselId,
        vesselName: a.vesselName,
        type: a.type,
        severity: a.severity,
        location: a.location,
        status: a.status,
        zone: a.zone,
        detectionDetail: a.detectionDetail,
      });

      const newAlerts: Incident[] = (payload.alerts || []).map(mapAlert);
      const newFishingAlerts: Incident[] = (payload.fishingAlerts || []).map(mapAlert);

      // Log new alerts
      const newLogs = newAlerts.slice(0, 3).map((inc) => ({
        timestamp: inc.timestamp,
        message: `[${inc.severity}] ${inc.type} — ${inc.vesselName}${inc.zone ? ' @ ' + inc.zone : ''}`,
      }));

      // Stress test tracking
      const stats = payload.stats ?? state.stats;
      const stressRunning = stats.stressRunning ?? false;
      const msgPerSec = stats.msgPerSec ?? 0;

      const stressHistory: StressSnapshot[] = stressRunning
        ? [...state.stressHistory, { msgPerSec, timestamp: Date.now() }].slice(-60)
        : state.stressHistory;

      set({
        vessels: newVessels,
        activeThreats: newAlerts.filter((a) => a.status === 'ACTIVE').slice(0, 100),
        fishingAlerts: newFishingAlerts.slice(0, 100),
        logs: [...newLogs, ...state.logs].slice(0, 200),
        stats,
        restrictedCells: payload.restrictedCells || [],
        stressRunning,
        stressMsgPerSec: msgPerSec,
        stressHistory,
        stressTotal: stressRunning ? state.stressTotal + msgPerSec : state.stressTotal,
      });
    } catch (e) {
      console.error('WS parse error', e);
    }
  };

  ws.onclose = () => {
    ws = null;
    set((state) => ({
      wsConnected: false,
      logs: [{ timestamp: new Date().toISOString(), message: '⚠️ Engine disconnected — retrying...' }, ...state.logs].slice(0, 100),
    }));
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connectWs(set, get), RECONNECT_DELAY_MS);
  };

  ws.onerror = () => ws?.close();
}

export const useEngineStore = create<EngineState>((set, get) => ({
  vessels: [],
  activeThreats: [],
  threatHistory: [],
  fishingAlerts: [],
  logs: [],
  wsConnected: false,
  stats: {
    totalTracked: 0, msgProcessed: 0, activeThreats: 0,
    uptime: '0m 0s', msgPerSec: 0, latency: 0,
    stressRunning: false, fishingAlerts: 0,
  },
  simulation: { isRunning: true, speedMultiplier: 1 },
  settings: { showH3Grid: true },
  restrictedCells: [],
  selectedVessel: null,
  stressRunning: false,
  stressMsgPerSec: 0,
  stressHistory: [],
  stressTotal: 0,
  actions: {
    initEngine: () => connectWs(set, get),
    toggleSimulation: () => set((s) => ({ simulation: { ...s.simulation, isRunning: !s.simulation.isRunning } })),
    toggleH3Grid: () => set((s) => ({ settings: { ...s.settings, showH3Grid: !s.settings.showH3Grid } })),
    tick: () => {},
    setSelectedVessel: (id) => set({ selectedVessel: id }),
    triggerSimulation: async (event) => {
      try {
        const res = await fetch(`${API_BASE}/api/simulation/${event}`, { method: 'POST' });
        const data = await res.json() as { status: string; event: string };
        set((s) => ({
          logs: [{ timestamp: new Date().toLocaleTimeString(), message: `🎯 Simulation triggered: ${data.event}` }, ...s.logs].slice(0, 200),
        }));
      } catch (e) { console.error('Simulation trigger failed', e); }
    },
    startStressTest: async () => {
      try {
        await fetch(`${API_BASE}/api/stress/start`, { method: 'POST' });
        set({ stressRunning: true, stressHistory: [], stressTotal: 0 });
      } catch (e) { console.error('Stress test start failed', e); }
    },
    stopStressTest: async () => {
      try {
        await fetch(`${API_BASE}/api/stress/stop`, { method: 'POST' });
        set({ stressRunning: false });
      } catch (e) { console.error('Stress test stop failed', e); }
    },
  },
}));
