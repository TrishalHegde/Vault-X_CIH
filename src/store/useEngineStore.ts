import { create } from 'zustand';

export interface Vessel {
  id: string;
  mmsi: string;
  name: string;
  lat: number;
  lng: number;
  type: 'cargo' | 'tanker' | 'passenger' | 'fishing' | 'patrol' | 'research' | 'tug' | 'military';
  heading: number;
  speed: number;
  risk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  history: [number, number][]; // lat, lng pairs
  originPort?: string;
  destinationPort?: string;
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
}

export interface LogEntry {
  timestamp: string;
  message: string;
}

interface EngineState {
  vessels: Vessel[];
  activeThreats: Incident[];
  threatHistory: Incident[];
  logs: LogEntry[];
  stats: {
    totalTracked: number;
    msgProcessed: number;
    activeThreats: number;
    uptime: string;
    msgPerSec: number;
    latency: number;
  };
  simulation: {
    isRunning: boolean;
    speedMultiplier: number;
  };
  settings: {
    showH3Grid: boolean;
  };
  restrictedCells: string[];
  selectedVessel: string | null;
  actions: {
    initEngine: () => void;
    toggleSimulation: () => void;
    toggleH3Grid: () => void;
    tick: () => void; // Keep for compatibility if UI calls it
    setSelectedVessel: (id: string | null) => void;
  };
}

let ws: WebSocket | null = null;

export const useEngineStore = create<EngineState>((set, get) => ({
  vessels: [],
  activeThreats: [],
  threatHistory: [],
  logs: [],
  stats: {
    totalTracked: 0,
    msgProcessed: 0,
    activeThreats: 0,
    uptime: '0m 0s',
    msgPerSec: 0,
    latency: 0,
  },
  simulation: {
    isRunning: true,
    speedMultiplier: 1,
  },
  settings: {
    showH3Grid: true,
  },
  restrictedCells: [],
  selectedVessel: null,
  actions: {
    initEngine: () => {
      // Backend is removed, websocket connection disabled.
      console.log("Engine init called, but backend has been removed.");
      set((state) => ({
        logs: [{ timestamp: new Date().toISOString(), message: 'Offline mode: Backend disconnected' }, ...state.logs].slice(0, 100)
      }));
    },
    toggleSimulation: () => {
      set((state) => ({
        simulation: { ...state.simulation, isRunning: !state.simulation.isRunning }
      }));
    },
    toggleH3Grid: () => {
      set((state) => ({
        settings: { ...state.settings, showH3Grid: !state.settings.showH3Grid }
      }));
    },
    tick: () => {
      // Handled by WS now. Keep function so UI doesn't crash if it calls tick() directly.
    },
    setSelectedVessel: (id) => {
      set({ selectedVessel: id });
    }
  }
}));
