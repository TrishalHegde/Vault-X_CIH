// India Maritime Digital Twin - Port Definitions
// All coordinates are [lat, lng] pairs

export interface Port {
  id: string;
  name: string;
  lat: number;
  lng: number;
  coast: 'west' | 'east' | 'island';
  anchorageLat?: number;
  anchorageLng?: number;
}

export const INDIAN_PORTS: Port[] = [
  // ── West Coast ──
  { id: 'PORT-KANDLA',       name: 'Deendayal Port (Kandla)',       coast: 'west', lat: 23.0116, lng: 70.2185, anchorageLat: 22.95, anchorageLng: 69.90 },
  { id: 'PORT-MUNDRA',       name: 'Mundra Port',                    coast: 'west', lat: 22.8397, lng: 69.7059, anchorageLat: 22.80, anchorageLng: 69.60 },
  { id: 'PORT-JNPT',         name: 'JNPT (Nhava Sheva)',             coast: 'west', lat: 18.9500, lng: 72.9500, anchorageLat: 18.80, anchorageLng: 72.75 },
  { id: 'PORT-MUMBAI',       name: 'Mumbai Port Trust',              coast: 'west', lat: 18.9220, lng: 72.8347, anchorageLat: 18.85, anchorageLng: 72.78 },
  { id: 'PORT-MORMUGAO',     name: 'Mormugao Port',                  coast: 'west', lat: 15.4099, lng: 73.8015, anchorageLat: 15.38, anchorageLng: 73.75 },
  { id: 'PORT-MANGALORE',    name: 'New Mangalore Port',             coast: 'west', lat: 12.9259, lng: 74.7937, anchorageLat: 12.90, anchorageLng: 74.72 },
  { id: 'PORT-KOCHI',        name: 'Kochi Port',                     coast: 'west', lat:  9.9312, lng: 76.2673, anchorageLat:  9.87, anchorageLng: 76.22 },
  { id: 'PORT-TUTICORIN',    name: 'V.O. Chidambaranar Port',        coast: 'west', lat:  8.7642, lng: 78.1348, anchorageLat:  8.72, anchorageLng: 78.08 },

  // ── East Coast ──
  { id: 'PORT-CHENNAI',      name: 'Chennai Port',                   coast: 'east', lat: 13.0827, lng: 80.2707, anchorageLat: 13.10, anchorageLng: 80.32 },
  { id: 'PORT-ENNORE',       name: 'Kamarajar Port (Ennore)',        coast: 'east', lat: 13.2450, lng: 80.3235, anchorageLat: 13.28, anchorageLng: 80.37 },
  { id: 'PORT-VIZAG',        name: 'Visakhapatnam Port',             coast: 'east', lat: 17.6868, lng: 83.2185, anchorageLat: 17.72, anchorageLng: 83.28 },
  { id: 'PORT-PARADIP',      name: 'Paradip Port',                   coast: 'east', lat: 20.2662, lng: 86.6796, anchorageLat: 20.30, anchorageLng: 86.73 },
  { id: 'PORT-HALDIA',       name: 'Haldia Dock Complex',            coast: 'east', lat: 22.0500, lng: 88.0500, anchorageLat: 21.95, anchorageLng: 87.95 },
  { id: 'PORT-KOLKATA',      name: 'Kolkata Port (KoPT)',            coast: 'east', lat: 22.5726, lng: 88.3639, anchorageLat: 22.50, anchorageLng: 88.30 },

  // ── Island Territories ──
  { id: 'PORT-PORTBLAIR',    name: 'Port Blair',                     coast: 'island', lat: 11.6234, lng: 92.7265, anchorageLat: 11.58, anchorageLng: 92.68 },
  { id: 'PORT-KAVARATTI',    name: 'Kavaratti Island (Lakshadweep)', coast: 'island', lat: 10.5669, lng: 72.6420, anchorageLat: 10.52, anchorageLng: 72.58 },
];

export const PORT_MAP = new Map(INDIAN_PORTS.map(p => [p.id, p]));

export function getPort(id: string): Port | undefined {
  return PORT_MAP.get(id);
}
