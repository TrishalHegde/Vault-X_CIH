export interface Region {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface EcologicalZone extends Region {
  maxSpeedKnots: number;
}

// Major Indian Ports & Approved Anchorages
export const INDIAN_PORTS: Region[] = [
  { id: 'PORT-MUMBAI', name: 'Mumbai Port Trust', lat: 18.9220, lng: 72.8347, radiusKm: 5 },
  { id: 'PORT-JNPT', name: 'Jawaharlal Nehru Port', lat: 18.9500, lng: 72.9500, radiusKm: 6 },
  { id: 'PORT-CHENNAI', name: 'Chennai Port', lat: 13.0827, lng: 80.2707, radiusKm: 5 },
  { id: 'PORT-KOCHI', name: 'Kochi Port', lat: 9.9312, lng: 76.2673, radiusKm: 4 },
  { id: 'PORT-VISAKHAPATNAM', name: 'Visakhapatnam Port', lat: 17.6868, lng: 83.2185, radiusKm: 5 },
  { id: 'PORT-HALDIA', name: 'Haldia Port', lat: 21.6013, lng: 88.0837, radiusKm: 5 },
  { id: 'PORT-MANGALORE', name: 'New Mangalore Port', lat: 12.9259, lng: 74.7937, radiusKm: 5 },
  { id: 'PORT-TUTICORIN', name: 'V.O. Chidambaranar Port', lat: 8.7642, lng: 78.1348, radiusKm: 4 },
  { id: 'PORT-PARADIP', name: 'Paradip Port', lat: 20.2662, lng: 86.6796, radiusKm: 5 },
  { id: 'PORT-KANDLA', name: 'Deendayal Port Trust (Kandla)', lat: 23.0116, lng: 70.2185, radiusKm: 6 }
];

// Protected Ecological Regions in Indian Waters
export const INDIAN_ECOLOGICAL_ZONES: EcologicalZone[] = [
  { id: 'ECO-GULF-MANNAR', name: 'Gulf of Mannar Biosphere Reserve', lat: 8.9288, lng: 78.6797, radiusKm: 30, maxSpeedKnots: 10 },
  { id: 'ECO-SUNDARBANS', name: 'Sundarbans National Park Waters', lat: 21.8493, lng: 88.8924, radiusKm: 40, maxSpeedKnots: 8 },
  { id: 'ECO-CHILIKA', name: 'Chilika Lake', lat: 19.7029, lng: 85.3182, radiusKm: 20, maxSpeedKnots: 5 },
  { id: 'ECO-LAKSHADWEEP', name: 'Lakshadweep Coral Reefs', lat: 10.5667, lng: 72.6167, radiusKm: 50, maxSpeedKnots: 12 },
  { id: 'ECO-ANDAMAN', name: 'Mahatma Gandhi Marine National Park', lat: 11.5976, lng: 92.6186, radiusKm: 25, maxSpeedKnots: 10 }
];

// A simplified bounding box representing the Indian EEZ roughly. 
// For precise calculations, actual EEZ polygon would be used.
export const INDIAN_EEZ_BOUNDS = {
  minLat: 6.5,
  maxLat: 22.5,
  minLng: 68.0,
  maxLng: 89.0
};

// Distance calculation helper (Haversine)
export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isInsideRegion(lat: number, lng: number, region: Region): boolean {
  return getDistanceKm(lat, lng, region.lat, region.lng) <= region.radiusKm;
}
