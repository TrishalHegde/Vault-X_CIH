import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useEngineStore } from '../../store/useEngineStore';
import { H3GridOverlay } from '../map/H3GridOverlay';
import restrictedZonesData from '../../data/restricted_zones.json';

// Fix leafet default icon path issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const createVesselIcon = (name: string, heading: number, risk: string) => {
  // All displayed vessels are flagged — use bright threat colors
  const color = risk === 'high' ? '#ff1744' : '#ff6d00';
  const glowColor = risk === 'high' ? 'rgba(255,23,68,0.5)' : 'rgba(255,109,0,0.4)';
  const pulseSize = 56;
  
  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div style="position: relative; width: 40px; height: 40px; transform: rotate(${heading}deg);">
        <!-- Pulsing outer ring -->
        <div style="position: absolute; top: ${-(pulseSize-40)/2}px; left: ${-(pulseSize-40)/2}px; width: ${pulseSize}px; height: ${pulseSize}px; border-radius: 50%; background: ${glowColor}; animation: pulse-ring 1.5s ease-out infinite;"></div>
        <!-- Solid glow circle -->
        <div style="position: absolute; inset: -4px; border-radius: 50%; border: 2px solid ${color}; background: ${color}22; box-shadow: 0 0 12px ${glowColor}, 0 0 24px ${glowColor};"></div>
        <!-- Ship triangle -->
        <svg width="40" height="40" viewBox="0 0 40 40" style="position: relative; z-index: 10;">
          <polygon points="20,4 34,32 6,32" fill="${color}" stroke="#fff" stroke-width="1.5" />
          <polygon points="20,10 28,28 12,28" fill="#fff" opacity="0.3" />
        </svg>
      </div>
      <!-- Name label -->
      <div style="position: absolute; top: -22px; left: 44px; color: #fff; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 900; white-space: nowrap; text-shadow: 0 0 4px ${color}, 0 0 8px ${color}, 1px 1px 2px rgba(0,0,0,0.9); background: rgba(0,0,0,0.6); padding: 1px 6px; border-left: 3px solid ${color};">
        ⚠ ${name}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

export const MapCanvas: React.FC = () => {
  // Center on Indian Coastline
  const MAP_CENTER: [number, number] = [17.0, 78.0];
  
  const vessels = useEngineStore((state) => state.vessels);
  const activeThreats = useEngineStore((state) => state.activeThreats);
  const fishingAlerts = useEngineStore((state) => state.fishingAlerts);
  const initEngine = useEngineStore((state) => state.actions.initEngine);
  const setSelectedVessel = useEngineStore((state) => state.actions.setSelectedVessel);

  // Collect IDs of all flagged vessels
  const flaggedVesselIds = new Set([
    ...activeThreats.map(t => t.vesselId),
    ...fishingAlerts.map(t => t.vesselId)
  ]);

  // Only display vessels that are flagged
  const displayedVessels = vessels.filter(v => flaggedVesselIds.has(v.id));

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
        {/* Realistic Base Map - Google Maps Standard */}
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          attribution='&copy; <a href="https://www.google.com/intl/en_us/help/terms_maps.html">Google Maps</a>'
        />

        {/* Restricted Zones GeoJSON */}
        <GeoJSON 
          data={restrictedZonesData as any} 
          style={() => ({
            color: '#ff0000',
            weight: 2,
            opacity: 0.6,
            fillColor: '#ff0000',
            fillOpacity: 0.1
          })}
        />

        {/* Live Vessels and Trails (Only Flagged) */}
        {displayedVessels.map(v => (
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
