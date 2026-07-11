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

let pollInterval: ReturnType<typeof setInterval> | null = null;

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
      if (pollInterval) return; // already started
      
      console.log("Connecting to FastAPI sidecar...");
      set((state) => ({
        logs: [{ timestamp: new Date().toISOString(), message: 'Connected to Grid & Gate Backend' }, ...state.logs].slice(0, 100)
      }));

      pollInterval = setInterval(async () => {
        try {
          const res = await fetch('http://localhost:3000/alerts');
          if (!res.ok) throw new Error('API Error');
          const data = await res.json();
          
          if (Array.isArray(data)) {
            // Map the Python response to our UI state
            const mappedThreats: Incident[] = data.map((alert: any) => ({
              id: `${alert.mmsi}-${alert.time}`,
              timestamp: alert.time,
              vesselId: alert.mmsi,
              vesselName: `Vessel ${alert.mmsi}`,
              type: 'Speed Violation in MPA',
              severity: 'CRITICAL',
              location: `${alert.lat.toFixed(4)}, ${alert.lon.toFixed(4)}`,
              status: 'ACTIVE'
            }));

            const mappedVessels: Vessel[] = data.map((alert: any) => ({
              id: alert.mmsi,
              mmsi: alert.mmsi,
              name: `Vessel ${alert.mmsi}`,
              lat: alert.lat,
              lng: alert.lon,
              type: 'cargo',
              heading: 0,
              speed: alert.speed,
              risk: 'critical',
              riskScore: 99,
              history: []
            }));

            // Deduplicate vessels (just keep latest per MMSI for simplicity)
            const uniqueVesselsMap = new Map<string, Vessel>();
            mappedVessels.forEach(v => uniqueVesselsMap.set(v.id, v));
            const uniqueVessels = Array.from(uniqueVesselsMap.values());

            set((state) => ({
              activeThreats: mappedThreats,
              vessels: uniqueVessels,
              stats: {
                ...state.stats,
                activeThreats: mappedThreats.length,
                totalTracked: uniqueVessels.length,
              }
            }));
          }
        } catch (err) {
          console.error("Failed to fetch alerts:", err);
        }
      }, 2000);
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
