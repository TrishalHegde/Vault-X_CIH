// India Maritime Digital Twin - Shipping Route Definitions
// All waypoints are [lat, lng] pairs, following actual deep-water shipping lanes

export interface Route {
  id: string;
  name: string;
  waypoints: [number, number][];
  vesselTypes: string[]; // allowed vessel types on this route
  frequency: number;    // relative frequency (0-1), used to weight route selection
}

export const MARITIME_ROUTES: Route[] = [

  // ═══════════════════════════════════════
  // WEST COAST COASTAL ROUTES
  // ═══════════════════════════════════════
  {
    id: 'ROUTE-KANDLA-MUMBAI',
    name: 'Kandla to Mumbai',
    vesselTypes: ['cargo', 'tanker', 'bulk_carrier', 'tug'],
    frequency: 0.08,
    waypoints: [
      [23.0116, 70.2185], // Kandla
      [22.8, 70.8],
      [22.0, 71.0],
      [21.0, 71.5],
      [20.0, 72.0],
      [19.2, 72.5],
      [18.9220, 72.8347], // Mumbai
    ]
  },
  {
    id: 'ROUTE-MUMBAI-KOCHI',
    name: 'Mumbai to Kochi',
    vesselTypes: ['cargo', 'tanker', 'passenger', 'container'],
    frequency: 0.09,
    waypoints: [
      [18.9220, 72.8347], // Mumbai
      [17.0, 72.5],
      [15.5, 73.0],
      [14.0, 73.5],
      [12.9259, 74.7937], // Mangalore
      [11.5, 75.2],
      [10.5, 75.8],
      [9.9312, 76.2673],  // Kochi
    ]
  },
  {
    id: 'ROUTE-KOCHI-TUTICORIN',
    name: 'Kochi to Tuticorin',
    vesselTypes: ['cargo', 'fishing', 'passenger'],
    frequency: 0.05,
    waypoints: [
      [9.9312, 76.2673],  // Kochi
      [9.0, 76.5],
      [8.7642, 78.1348],  // Tuticorin
    ]
  },
  {
    id: 'ROUTE-MORMUGAO-MUMBAI',
    name: 'Mormugao to Mumbai',
    vesselTypes: ['cargo', 'bulk_carrier'],
    frequency: 0.04,
    waypoints: [
      [15.4099, 73.8015], // Mormugao
      [16.5, 73.2],
      [17.5, 72.9],
      [18.9220, 72.8347], // Mumbai
    ]
  },

  // ═══════════════════════════════════════
  // EAST COAST COASTAL ROUTES
  // ═══════════════════════════════════════
  {
    id: 'ROUTE-CHENNAI-VIZAG',
    name: 'Chennai to Visakhapatnam',
    vesselTypes: ['cargo', 'bulk_carrier', 'tanker', 'container'],
    frequency: 0.07,
    waypoints: [
      [13.0827, 80.2707], // Chennai
      [14.0, 80.5],
      [15.5, 81.0],
      [16.5, 82.0],
      [17.6868, 83.2185], // Visakhapatnam
    ]
  },
  {
    id: 'ROUTE-VIZAG-PARADIP',
    name: 'Visakhapatnam to Paradip',
    vesselTypes: ['cargo', 'bulk_carrier', 'tanker'],
    frequency: 0.05,
    waypoints: [
      [17.6868, 83.2185], // Visakhapatnam
      [18.5, 84.0],
      [19.5, 85.0],
      [20.2662, 86.6796], // Paradip
    ]
  },
  {
    id: 'ROUTE-PARADIP-HALDIA',
    name: 'Paradip to Haldia',
    vesselTypes: ['cargo', 'bulk_carrier', 'tanker'],
    frequency: 0.05,
    waypoints: [
      [20.2662, 86.6796], // Paradip
      [21.0, 87.2],
      [21.5, 87.8],
      [22.0500, 88.0500], // Haldia
    ]
  },

  // ═══════════════════════════════════════
  // INTERNATIONAL ROUTES - ARABIAN SEA
  // ═══════════════════════════════════════
  {
    id: 'ROUTE-MUMBAI-DUBAI',
    name: 'Mumbai to Dubai',
    vesselTypes: ['cargo', 'container', 'tanker'],
    frequency: 0.10,
    waypoints: [
      [18.9220, 72.8347], // Mumbai
      [19.5, 71.0],
      [20.5, 68.5],
      [21.5, 66.0],
      [22.5, 63.5],
      [23.5, 60.5],
      [24.0, 57.5],
      [25.2048, 55.2708], // Dubai
    ]
  },
  {
    id: 'ROUTE-MUMBAI-MUSCAT',
    name: 'Mumbai to Muscat',
    vesselTypes: ['cargo', 'tanker', 'container'],
    frequency: 0.07,
    waypoints: [
      [18.9220, 72.8347], // Mumbai
      [19.0, 71.0],
      [20.0, 69.0],
      [21.0, 67.0],
      [22.0, 64.0],
      [23.5897, 58.4094], // Muscat
    ]
  },
  {
    id: 'ROUTE-KANDLA-GULF',
    name: 'Kandla to Arabian Gulf',
    vesselTypes: ['tanker', 'cargo'],
    frequency: 0.06,
    waypoints: [
      [23.0116, 70.2185], // Kandla
      [23.5, 69.0],
      [24.0, 67.0],
      [24.5, 65.0],
      [24.5, 62.0],
      [24.0, 59.0],
      [23.5897, 58.4094], // Muscat
    ]
  },
  {
    id: 'ROUTE-MUMBAI-COLOMBO',
    name: 'Mumbai to Colombo',
    vesselTypes: ['cargo', 'container', 'passenger'],
    frequency: 0.06,
    waypoints: [
      [18.9220, 72.8347], // Mumbai
      [16.0, 73.5],
      [13.0, 74.5],
      [10.0, 76.0],
      [7.5, 78.0],
      [6.9271, 79.8612], // Colombo
    ]
  },

  // ═══════════════════════════════════════
  // INTERNATIONAL ROUTES - BAY OF BENGAL
  // ═══════════════════════════════════════
  {
    id: 'ROUTE-KOCHI-SINGAPORE',
    name: 'Kochi to Singapore',
    vesselTypes: ['container', 'cargo', 'tanker'],
    frequency: 0.08,
    waypoints: [
      [9.9312, 76.2673],  // Kochi
      [6.0, 80.0],
      [3.0, 84.0],
      [2.0, 88.0],
      [2.0, 94.0],
      [1.3521, 103.8198], // Singapore
    ]
  },
  {
    id: 'ROUTE-CHENNAI-SINGAPORE',
    name: 'Chennai to Singapore',
    vesselTypes: ['container', 'cargo'],
    frequency: 0.07,
    waypoints: [
      [13.0827, 80.2707], // Chennai
      [10.0, 82.0],
      [7.0, 85.0],
      [4.0, 90.0],
      [2.0, 95.0],
      [1.3521, 103.8198], // Singapore
    ]
  },
  {
    id: 'ROUTE-VIZAG-SINGAPORE',
    name: 'Visakhapatnam to Singapore',
    vesselTypes: ['container', 'cargo', 'tanker'],
    frequency: 0.06,
    waypoints: [
      [17.6868, 83.2185], // Visakhapatnam
      [14.0, 84.0],
      [10.0, 86.0],
      [6.0, 90.0],
      [3.0, 97.0],
      [1.3521, 103.8198], // Singapore
    ]
  },
  {
    id: 'ROUTE-PARADIP-BANGLADESH',
    name: 'Paradip to Chittagong (Bangladesh)',
    vesselTypes: ['cargo', 'bulk_carrier'],
    frequency: 0.04,
    waypoints: [
      [20.2662, 86.6796], // Paradip
      [20.8, 87.5],
      [21.5, 89.0],
      [22.0, 89.8],
      [22.3419, 91.8326], // Chittagong
    ]
  },

  // ═══════════════════════════════════════
  // ANDAMAN & NICOBAR ROUTES
  // ═══════════════════════════════════════
  {
    id: 'ROUTE-PORTBLAIR-CHENNAI',
    name: 'Port Blair to Chennai',
    vesselTypes: ['cargo', 'passenger', 'supply'],
    frequency: 0.04,
    waypoints: [
      [11.6234, 92.7265], // Port Blair
      [11.0, 90.0],
      [10.0, 87.0],
      [9.0, 84.0],
      [9.0, 82.0],
      [10.5, 80.8],
      [13.0827, 80.2707], // Chennai
    ]
  },
  {
    id: 'ROUTE-PORTBLAIR-SINGAPORE',
    name: 'Port Blair to Singapore',
    vesselTypes: ['cargo', 'container'],
    frequency: 0.03,
    waypoints: [
      [11.6234, 92.7265], // Port Blair
      [8.0, 96.0],
      [4.0, 100.0],
      [1.3521, 103.8198], // Singapore
    ]
  },
  {
    id: 'ROUTE-PORTBLAIR-THAILAND',
    name: 'Port Blair to Phuket (Thailand)',
    vesselTypes: ['cargo', 'passenger'],
    frequency: 0.03,
    waypoints: [
      [11.6234, 92.7265], // Port Blair
      [10.0, 95.0],
      [8.5, 97.5],
      [7.8804, 98.3923], // Phuket
    ]
  },

  // ═══════════════════════════════════════
  // SUPPLY VESSEL LOOPS (Port ↔ Offshore)
  // ═══════════════════════════════════════
  {
    id: 'ROUTE-MH-SUPPLY-LOOP-N',
    name: 'Mumbai High North Supply Loop',
    vesselTypes: ['supply'],
    frequency: 0.04,
    waypoints: [
      [18.9220, 72.8347], // Mumbai Port
      [19.1, 72.2],
      [19.4000, 71.6500], // Mumbai High North Platform
      [19.1, 72.2],
      [18.9220, 72.8347], // Mumbai Port
    ]
  },
  {
    id: 'ROUTE-MH-SUPPLY-LOOP-S',
    name: 'Mumbai High South Supply Loop',
    vesselTypes: ['supply'],
    frequency: 0.03,
    waypoints: [
      [18.9500, 72.9500], // JNPT
      [19.0, 72.5],
      [19.0500, 72.0200], // Mumbai High South Platform
      [19.0, 72.5],
      [18.9500, 72.9500], // JNPT
    ]
  },
  {
    id: 'ROUTE-KGD6-SUPPLY',
    name: 'KG-D6 Supply Loop',
    vesselTypes: ['supply'],
    frequency: 0.03,
    waypoints: [
      [17.6868, 83.2185], // Visakhapatnam
      [16.0, 82.7],
      [15.2000, 82.5500], // KG-D6 Well A
      [15.5, 82.7],
      [17.6868, 83.2185], // Visakhapatnam
    ]
  },
  {
    id: 'ROUTE-LAKSHADWEEP-KOCHI',
    name: 'Kavaratti to Kochi',
    vesselTypes: ['passenger', 'cargo', 'supply'],
    frequency: 0.03,
    waypoints: [
      [10.5669, 72.6420], // Kavaratti
      [10.2, 73.5],
      [9.9, 75.0],
      [9.9312, 76.2673],  // Kochi
    ]
  },
];

// Reverse routes for return traffic
const reversedRoutes: Route[] = MARITIME_ROUTES.filter(r => !r.id.startsWith('ROUTE-MH') && !r.id.startsWith('ROUTE-KGD6') && !r.id.startsWith('ROUTE-LAKSHADWEEP')).map(r => ({
  id: `${r.id}-REV`,
  name: `${r.name.split(' to ').reverse().join(' to ')}`,
  vesselTypes: r.vesselTypes,
  frequency: r.frequency * 0.8,
  waypoints: [...r.waypoints].reverse() as [number, number][],
}));

export const ALL_ROUTES = [...MARITIME_ROUTES, ...reversedRoutes];
