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
}

export interface Incident {
  id: string;
  timestamp: string;
  vesselId: string;
  vesselName: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
  location: string;
}

export interface LogEntry {
  timestamp: string;
  message: string;
}

interface EngineState {
  vessels: Vessel[];
  incidents: Incident[];
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
  selectedVessel: string | null;
  actions: {
    initEngine: () => void;
    toggleSimulation: () => void;
    tick: () => void;
    setSelectedVessel: (id: string | null) => void;
  };
}

// Helper to generate random vessels around multiple regions
const generateVessels = (count: number): Vessel[] => {
  const types = ['cargo', 'tanker', 'passenger', 'fishing', 'patrol', 'research', 'tug', 'military'] as const;
  const vessels: Vessel[] = [];
  
  const regions = [
    { lat: 12.9259, lng: 74.7937, name: 'Mangalore' },
    { lat: 1.2902, lng: 103.8519, name: 'Singapore' },
    { lat: 51.9225, lng: 4.4791, name: 'Rotterdam' },
    { lat: 35.9375, lng: -5.3160, name: 'Gibraltar' },
    { lat: 8.9585, lng: -79.5292, name: 'Panama' }
  ];
  
  for (let i = 0; i < count; i++) {
    const region = regions[Math.floor(Math.random() * regions.length)];
    // Spread them out over a much larger area (approx 10 degrees)
    const latOffset = (Math.random() - 0.5) * 15;
    const lngOffset = (Math.random() - 0.5) * 15;
    
    vessels.push({
      id: `V${i.toString().padStart(4, '0')}`,
      mmsi: Math.floor(100000000 + Math.random() * 900000000).toString(),
      name: `VESSEL-${i}`,
      lat: region.lat + latOffset,
      lng: region.lng + lngOffset,
      type: types[Math.floor(Math.random() * types.length)],
      heading: Math.floor(Math.random() * 360),
      speed: Math.random() * 20 + 5,
      risk: Math.random() > 0.95 ? 'high' : 'low',
      history: [],
    });
  }
  
  // Hardcode a few specific ones in Mangalore
  vessels[0].name = 'MT PACIFIC EXP';
  vessels[0].risk = 'low';
  vessels[0].lat = 12.9200;
  vessels[0].lng = 74.7800;
  vessels[1].name = 'DARK FLEET TGT 01';
  vessels[1].risk = 'high';
  vessels[1].lat = 12.9400;
  vessels[1].lng = 74.7700;
  
  return vessels;
};

export const useEngineStore = create<EngineState>((set, get) => ({
  vessels: [],
  incidents: [],
  logs: [],
  stats: {
    totalTracked: 0,
    msgProcessed: 2145000000,
    activeThreats: 0,
    uptime: '342d 12h',
    msgPerSec: 50421,
    latency: 12,
  },
  simulation: {
    isRunning: true,
    speedMultiplier: 1,
  },
  selectedVessel: null,
  actions: {
    initEngine: () => {
      const v = generateVessels(350);
      set({ 
        vessels: v, 
        stats: { ...get().stats, totalTracked: v.length, activeThreats: v.filter(x => x.risk === 'high').length } 
      });
      
      setInterval(() => {
        get().actions.tick();
      }, 1000);
    },
    toggleSimulation: () => {
      set((state) => ({
        simulation: { ...state.simulation, isRunning: !state.simulation.isRunning }
      }));
    },
    tick: () => {
      const state = get();
      if (!state.simulation.isRunning) return;

      const newVessels = state.vessels.map(v => {
        const rad = (v.heading - 90) * (Math.PI / 180);
        // Add current pos to history
        const history = [...v.history, [v.lat, v.lng] as [number, number]];
        if (history.length > 50) history.shift();
        
        return {
          ...v,
          lat: v.lat - (Math.sin(rad) * (v.speed * 0.00005 * state.simulation.speedMultiplier)),
          lng: v.lng + (Math.cos(rad) * (v.speed * 0.00005 * state.simulation.speedMultiplier)),
          history
        };
      });

      // Simulate some jitter in stats
      const msgPerSec = Math.floor(50000 + Math.random() * 5000);
      const latency = Math.floor(8 + Math.random() * 10);
      const msgProcessed = state.stats.msgProcessed + msgPerSec;

      set({
        vessels: newVessels,
        stats: {
          ...state.stats,
          msgProcessed,
          msgPerSec,
          latency
        }
      });
    },
    setSelectedVessel: (id) => {
      set({ selectedVessel: id });
    }
  }
}));
