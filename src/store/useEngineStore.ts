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
  risk: 'low' | 'high';
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
    showH3Grid: false,
  },
  restrictedCells: [],
  selectedVessel: null,
  actions: {
    initEngine: () => {
      if (ws) return; // Already initialized
      
      ws = new WebSocket('ws://localhost:3000');
      
      ws.onopen = () => {
        set((state) => ({
          logs: [{ timestamp: new Date().toISOString(), message: 'Connected to Engine Server' }, ...state.logs].slice(0, 100)
        }));
      };

      ws.onmessage = (event) => {
        const state = get();
        if (!state.simulation.isRunning) return;

        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'engine_update') {
            
            // Map backend vessels to UI format with history tracking (history omitted from backend for bandwidth)
            const oldVesselsMap = new Map(state.vessels.map(v => [v.id, v]));
            
            const newVessels = payload.vessels.map((v: any) => {
              const oldV = oldVesselsMap.get(v.id);
              let history: [number, number][] = oldV ? [...oldV.history] : [];
              
              if (!oldV || oldV.lat !== v.lat || oldV.lng !== v.lng) {
                history.push([v.lat, v.lng]);
                if (history.length > 50) history.shift();
              }
              
              return { ...v, history };
            });

            const newIncidents: Incident[] = payload.alerts.map((a: any) => ({
              id: a.id,
              timestamp: new Date(a.timestamp).toLocaleTimeString(),
              vesselId: a.vesselId,
              vesselName: a.vesselName,
              type: a.type,
              severity: a.severity,
              location: a.location,
              status: a.status
            }));

            // Optional: generate log entries from incidents
            const newLogs = newIncidents.map(inc => ({
              timestamp: inc.timestamp,
              message: `[${inc.severity}] ${inc.type} on ${inc.vesselName} - ${inc.status}`
            }));

            const updatedActive = [...state.activeThreats];
            const updatedHistory = [...state.threatHistory];

            newIncidents.forEach(inc => {
              if (inc.status === 'ACTIVE') {
                updatedActive.unshift(inc);
              } else if (inc.status === 'RESOLVED') {
                const idx = updatedActive.findIndex(a => a.vesselId === inc.vesselId && a.type === inc.type);
                if (idx !== -1) {
                  const resolved = updatedActive.splice(idx, 1)[0];
                  resolved.status = 'RESOLVED';
                  resolved.timestamp = inc.timestamp; // update resolution time
                  updatedHistory.unshift(resolved);
                } else {
                  updatedHistory.unshift(inc);
                }
              }
            });

            set({
              vessels: newVessels,
              activeThreats: updatedActive.slice(0, 100),
              threatHistory: updatedHistory.slice(0, 500),
              logs: [...newLogs, ...state.logs].slice(0, 200),
              stats: payload.stats,
              restrictedCells: payload.restrictedCells || []
            });
          }
        } catch (e) {
          console.error("Error parsing WS message", e);
        }
      };

      ws.onclose = () => {
        ws = null;
        set((state) => ({
          logs: [{ timestamp: new Date().toISOString(), message: 'Disconnected from Engine Server' }, ...state.logs].slice(0, 100)
        }));
        // Reconnect logic can be added here
      };
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
