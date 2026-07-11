// India Maritime Digital Twin - Zone Definitions
// Marine Protected Areas, Naval Zones, Fishing Grounds, Offshore Energy, Grey Zones

export interface Zone {
  id: string;
  name: string;
  type: 'mpa' | 'naval' | 'fishing' | 'offshore' | 'grey_buffer' | 'grey_observation';
  center: [number, number]; // [lat, lng]
  radiusKm: number;
  maxSpeedKnots?: number; // Speed limit if applicable
  severity?: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
}

export interface OffshoreAsset {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'oil_platform' | 'gas_platform';
  servicePort: string; // Port ID
}

// ── Marine Protected Areas (MPAs) ──────────────────────────────────────────
export const MARINE_PROTECTED_AREAS: Zone[] = [
  { id: 'MPA-MANNAR',    name: 'Gulf of Mannar Marine National Park',     type: 'mpa', center: [8.9288, 78.6797],  radiusKm: 40, maxSpeedKnots: 10, severity: 'CRITICAL' },
  { id: 'MPA-KUTCH',     name: 'Gulf of Kutch Marine National Park',      type: 'mpa', center: [22.5, 69.8],       radiusKm: 30, maxSpeedKnots: 10, severity: 'CRITICAL' },
  { id: 'MPA-MALVAN',    name: 'Malvan Marine Sanctuary',                  type: 'mpa', center: [16.0610, 73.4630], radiusKm: 15, maxSpeedKnots: 8,  severity: 'CRITICAL' },
  { id: 'MPA-MAHATMA',   name: 'Mahatma Gandhi Marine National Park',     type: 'mpa', center: [11.5976, 92.6186], radiusKm: 30, maxSpeedKnots: 10, severity: 'CRITICAL' },
  { id: 'MPA-RANJHANSI', name: 'Rani Jhansi Marine National Park',        type: 'mpa', center: [13.2667, 93.0500], radiusKm: 25, maxSpeedKnots: 10, severity: 'CRITICAL' },
  { id: 'MPA-SUNDARBANS', name: 'Sundarbans Marine Reserve',              type: 'mpa', center: [21.8493, 88.8924], radiusKm: 50, maxSpeedKnots: 8,  severity: 'HIGH' },
  { id: 'MPA-LAKSHADWEEP', name: 'Lakshadweep Coral Reef Reserve',       type: 'mpa', center: [10.5667, 72.6167], radiusKm: 60, maxSpeedKnots: 12, severity: 'HIGH' },
];

// ── Naval Zones ─────────────────────────────────────────────────────────────
export const NAVAL_ZONES: Zone[] = [
  { id: 'NAV-MUMBAI',     name: 'Western Naval Command (Mumbai)',    type: 'naval', center: [18.9150, 72.8100], radiusKm: 8,  severity: 'CRITICAL' },
  { id: 'NAV-KADAMBA',    name: 'INS Kadamba (Karwar)',              type: 'naval', center: [14.8136, 74.1288], radiusKm: 10, severity: 'CRITICAL' },
  { id: 'NAV-KOCHI',      name: 'Southern Naval Command (Kochi)',    type: 'naval', center: [9.9700, 76.2600],  radiusKm: 6,  severity: 'CRITICAL' },
  { id: 'NAV-VIZAG',      name: 'Eastern Naval Command (Vizag)',     type: 'naval', center: [17.6800, 83.2300], radiusKm: 8,  severity: 'CRITICAL' },
  { id: 'NAV-PORTBLAIR',  name: 'Andaman & Nicobar Naval Command',  type: 'naval', center: [11.6300, 92.7300], radiusKm: 10, severity: 'CRITICAL' },
];

// ── Fishing Grounds ──────────────────────────────────────────────────────────
export const FISHING_GROUNDS: Zone[] = [
  { id: 'FISH-ARAB-NORTH',  name: 'Arabian Sea - North Fishing Ground',      type: 'fishing', center: [20.0, 67.0],  radiusKm: 200 },
  { id: 'FISH-ARAB-SOUTH',  name: 'Arabian Sea - South Fishing Ground',      type: 'fishing', center: [12.0, 72.0],  radiusKm: 150 },
  { id: 'FISH-BOB-NORTH',   name: 'Bay of Bengal - North Fishing Ground',    type: 'fishing', center: [20.0, 88.0],  radiusKm: 200 },
  { id: 'FISH-BOB-SOUTH',   name: 'Bay of Bengal - South Fishing Ground',    type: 'fishing', center: [12.0, 82.0],  radiusKm: 180 },
  { id: 'FISH-LAKSHADWEEP', name: 'Lakshadweep Sea Fishing Ground',          type: 'fishing', center: [10.0, 73.0],  radiusKm: 100 },
  { id: 'FISH-ANDAMAN',     name: 'Andaman Sea Fishing Ground',              type: 'fishing', center: [12.0, 94.0],  radiusKm: 120 },
  { id: 'FISH-GUJARAT',     name: 'Gujarat / Saurashtra Fishing Ground',     type: 'fishing', center: [21.5, 70.0],  radiusKm: 150 },
];

// ── Offshore Energy Assets ───────────────────────────────────────────────────
export const OFFSHORE_ASSETS: OffshoreAsset[] = [
  // Mumbai High
  { id: 'OFF-MH-NORTH', name: 'Mumbai High North',  lat: 19.4000, lng: 71.6500, type: 'oil_platform', servicePort: 'PORT-MUMBAI' },
  { id: 'OFF-MH-SOUTH', name: 'Mumbai High South',  lat: 19.0500, lng: 72.0200, type: 'oil_platform', servicePort: 'PORT-JNPT' },
  // KG-D6 Basin
  { id: 'OFF-KGD6-A',   name: 'KG-D6 Well A',       lat: 15.2000, lng: 82.5500, type: 'gas_platform', servicePort: 'PORT-VIZAG' },
  { id: 'OFF-KGD6-B',   name: 'KG-D6 Well B',       lat: 15.5000, lng: 82.8000, type: 'gas_platform', servicePort: 'PORT-VIZAG' },
  // Ravva Oil Field
  { id: 'OFF-RAVVA',    name: 'Ravva Oil Platform',  lat: 15.8700, lng: 81.7200, type: 'oil_platform', servicePort: 'PORT-VIZAG' },
  // Bassein
  { id: 'OFF-BASSEIN',  name: 'Bassein Gas Field',   lat: 19.7000, lng: 71.9000, type: 'gas_platform', servicePort: 'PORT-MUMBAI' },
];

// Auto-generate Grey Zones (buffer + observation) around MPAs and Naval Zones
function generateGreyZones(bases: Zone[]): Zone[] {
  const grey: Zone[] = [];
  for (const z of bases) {
    grey.push({
      id: `${z.id}-BUFFER`,
      name: `${z.name} - Primary Buffer (5km)`,
      type: 'grey_buffer',
      center: z.center,
      radiusKm: z.radiusKm + 5,
      severity: 'HIGH'
    });
    grey.push({
      id: `${z.id}-OBS`,
      name: `${z.name} - Observation Zone (15km)`,
      type: 'grey_observation',
      center: z.center,
      radiusKm: z.radiusKm + 15,
      severity: 'WARNING'
    });
  }
  return grey;
}

export const GREY_ZONES = generateGreyZones([...MARINE_PROTECTED_AREAS, ...NAVAL_ZONES]);

export const ALL_RESTRICTED_ZONES = [...MARINE_PROTECTED_AREAS, ...NAVAL_ZONES];
export const ALL_ZONES = [...MARINE_PROTECTED_AREAS, ...NAVAL_ZONES, ...GREY_ZONES, ...FISHING_GROUNDS];
