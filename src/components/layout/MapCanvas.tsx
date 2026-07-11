import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix leafet default icon path issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Vessel {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  heading: number;
  speed: number;
  risk: 'low' | 'high';
}

const createVesselIcon = (name: string, heading: number, risk: string) => {
  const color = risk === 'high' ? '#ffb4ab' : '#00daf3';
  const shadowClass = risk === 'high' ? 'pulse-critical' : 'glow-active';
  
  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div style="position: relative; width: 24px; height: 24px; transform: rotate(${heading}deg);">
        <div class="${shadowClass}" style="position: absolute; inset: 0; border-radius: 50%; border: 1px solid ${color}; background: ${color}33;"></div>
        <svg width="24" height="24" viewBox="-6 -6 24 24" style="position: relative; z-index: 10;">
          ${risk === 'high' 
            ? `<rect x="2" y="2" width="8" height="8" fill="${color}" />`
            : `<polygon points="6,-2 12,10 0,10" fill="${color}" />`
          }
        </svg>
      </div>
      <div style="position: absolute; top: -15px; left: 25px; color: ${color}; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: bold; white-space: nowrap; text-shadow: 0 0 4px #000, 0 0 4px #000;">
        ${name}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

export const MapCanvas: React.FC = () => {
  // Center on New Mangalore Port, India
  const MAP_CENTER: [number, number] = [12.9259, 74.7937];
  
  const [vessels, setVessels] = useState<Vessel[]>([
    { id: '1', name: 'MT PACIFIC EXP', lat: 12.9200, lng: 74.7800, type: 'container', heading: 45, speed: 18.2, risk: 'low' },
    { id: '2', name: 'DARK FLEET TGT 01', lat: 12.9400, lng: 74.7700, type: 'tanker', heading: 120, speed: 22.1, risk: 'high' },
    { id: '3', name: 'CG CUTTER VALIANT', lat: 12.9350, lng: 74.7850, type: 'patrol', heading: 340, speed: 28.0, risk: 'low' },
    { id: '4', name: 'ZHE HAI 515', lat: 12.9100, lng: 74.7900, type: 'bulk', heading: 20, speed: 12.5, risk: 'low' },
  ]);

  // Simulate live movement
  useEffect(() => {
    const interval = setInterval(() => {
      setVessels(prev => prev.map(v => {
        const rad = (v.heading - 90) * (Math.PI / 180);
        // Degrees approximation for movement
        const dx = Math.cos(rad) * (v.speed * 0.000005);
        const dy = Math.sin(rad) * (v.speed * 0.000005);
        return {
          ...v,
          lng: v.lng + dx,
          lat: v.lat - dy, // Subtracting because Leaflet lat goes UP, our math assumed down
        };
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-0 bg-[#0a0d10] [&_.leaflet-container]:bg-[#0a0d10] [&_.leaflet-container]:font-inter">
      <MapContainer 
        center={MAP_CENTER} 
        zoom={14} 
        style={{ width: '100%', height: '100%', backgroundColor: '#0a0d10' }}
        zoomControl={false}
      >
        {/* Realistic Base Map */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Tactical Overlay Elements mapped to Mangalore coordinates */}
        
        {/* Central Radar Ping */}
        <Circle center={MAP_CENTER} radius={3000} pathOptions={{ color: '#00daf3', opacity: 0.1, fillOpacity: 0.02, dashArray: '10, 20' }} />
        <Circle center={MAP_CENTER} radius={1000} pathOptions={{ color: '#00daf3', opacity: 0.2, fillOpacity: 0 }} />

        {/* Whale Corridor Geofence */}
        <Polyline 
          positions={[
            [12.9000, 74.7400],
            [12.9300, 74.7500],
            [12.9500, 74.7300],
          ]} 
          pathOptions={{ color: '#00e5ff', weight: 40, opacity: 0.1 }}
        />
        <Polyline 
          positions={[
            [12.9000, 74.7400],
            [12.9300, 74.7500],
            [12.9500, 74.7300],
          ]} 
          pathOptions={{ color: '#00e5ff', weight: 1, dashArray: '5, 5' }}
        />

        {/* Oil Spill Exclusion Zone */}
        <Polygon 
          positions={[
            [12.9550, 74.7800],
            [12.9600, 74.7950],
            [12.9450, 74.7900],
            [12.9400, 74.7750]
          ]} 
          pathOptions={{ color: '#ffb4ab', weight: 1, dashArray: '4, 2', fillColor: '#aa2600', fillOpacity: 0.15 }}
        />

        {/* Shipping Lane */}
        <Polyline 
          positions={[
            [12.9000, 74.7800],
            [12.9800, 74.8000],
          ]} 
          pathOptions={{ color: '#e8c351', weight: 60, opacity: 0.1 }}
        />
        <Polyline 
          positions={[
            [12.9000, 74.7800],
            [12.9800, 74.8000],
          ]} 
          pathOptions={{ color: '#e8c351', weight: 2, dashArray: '10, 10', opacity: 0.3 }}
        />

        {/* Live Vessels */}
        {vessels.map(v => (
          <Marker 
            key={v.id} 
            position={[v.lat, v.lng]} 
            icon={createVesselIcon(v.name, v.heading, v.risk)}
          />
        ))}
      </MapContainer>

      {/* Crosshairs & Center Point Overlay (Screen Space) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
        <div className="w-10 h-10 border border-[#00daf3]/30 rounded-full flex items-center justify-center">
          <div className="w-1 h-1 bg-[#00daf3]/50 rounded-full"></div>
        </div>
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#00daf3]/10"></div>
        <div className="absolute left-0 right-0 top-1/2 h-px bg-[#00daf3]/10"></div>
      </div>
    </div>
  );
};
