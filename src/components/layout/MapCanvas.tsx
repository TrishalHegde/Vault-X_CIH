import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useEngineStore } from '../../store/useEngineStore';
import { H3GridOverlay } from '../map/H3GridOverlay';

// Fix leafet default icon path issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const createVesselIcon = (name: string, heading: number, risk: string) => {
  const color = risk === 'high' ? '#ff0000' : '#0055ff';
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
      <div style="position: absolute; top: -15px; left: 25px; color: ${color}; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: bold; white-space: nowrap; text-shadow: 0 0 2px #fff, 0 0 2px #fff;">
        ${name}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

export const MapCanvas: React.FC = () => {
  // Center on Indian Coastline
  const MAP_CENTER: [number, number] = [17.0, 78.0];
  
  const vessels = useEngineStore((state) => state.vessels);
  const initEngine = useEngineStore((state) => state.actions.initEngine);
  const setSelectedVessel = useEngineStore((state) => state.actions.setSelectedVessel);

  useEffect(() => {
    // Initialize engine once
    initEngine();
  }, [initEngine]);

  return (
    <div className="absolute inset-0 z-0 [&_.leaflet-container]:font-inter">
      <MapContainer 
        center={MAP_CENTER} 
        zoom={5} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        {/* Base Map - Using Google servers with gl=IN to display official Indian political boundaries */}
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=m&gl=IN&x={x}&y={y}&z={z}"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          attribution="Map data &copy; Google"
        />

        {/* Removed Manual Tactical Overlays. Using H3GridOverlay instead. */}

        {/* Live Vessels and Trails */}
        {vessels.map(v => (
          <React.Fragment key={v.id}>
            {v.history.length > 1 && (
              <Polyline 
                positions={v.history} 
                pathOptions={{ color: v.risk === 'high' ? '#ff0000' : '#0055ff', weight: 2, opacity: 0.6 }} 
              />
            )}
            <Marker 
              position={[v.lat, v.lng]} 
              icon={createVesselIcon(v.name, v.heading, v.risk)}
              eventHandlers={{ click: () => setSelectedVessel(v.id) }}
            />
          </React.Fragment>
        ))}

        {/* H3 Grid Overlay */}
        <H3GridOverlay />
      </MapContainer>

      {/* Crosshairs & Center Point Overlay (Screen Space) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
        <div className="w-10 h-10 border border-[#0055ff]/50 rounded-full flex items-center justify-center">
          <div className="w-1 h-1 bg-[#0055ff] rounded-full"></div>
        </div>
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#0055ff]/30"></div>
        <div className="absolute left-0 right-0 top-1/2 h-px bg-[#0055ff]/30"></div>
      </div>
    </div>
  );
};
