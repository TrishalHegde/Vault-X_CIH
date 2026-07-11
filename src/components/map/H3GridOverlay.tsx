import React, { useMemo, useState } from 'react';
import { Polygon, useMapEvents } from 'react-leaflet';
import { polygonToCells, cellToBoundary } from 'h3-js';
import { useEngineStore } from '../../store/useEngineStore';

export const H3GridOverlay: React.FC = () => {
  const showH3Grid = useEngineStore((state) => state.settings.showH3Grid);
  const restrictedCells = useEngineStore((state) => state.restrictedCells);
  const [bounds, setBounds] = useState<number[][][] | null>(null);

  // Hook to update bounds when map moves
  useMapEvents({
    moveend: (e) => {
      if (!showH3Grid) return;
      const map = e.target;
      const b = map.getBounds();
      // Define a rough polygon of the current view to pass to polygonToCells
      const polygon = [
        [
          [b.getSouth(), b.getWest()],
          [b.getNorth(), b.getWest()],
          [b.getNorth(), b.getEast()],
          [b.getSouth(), b.getEast()],
          [b.getSouth(), b.getWest()] // close the loop
        ]
      ];
      setBounds(polygon);
    },
    zoomend: (e) => {
        if (!showH3Grid) return;
        const map = e.target;
        const b = map.getBounds();
        const polygon = [
          [
            [b.getSouth(), b.getWest()],
            [b.getNorth(), b.getWest()],
            [b.getNorth(), b.getEast()],
            [b.getSouth(), b.getEast()],
            [b.getSouth(), b.getWest()]
          ]
        ];
        setBounds(polygon);
    }
  });

  const cells = useMemo(() => {
    if (!showH3Grid || !bounds) return [];
    
    try {
      // H3 Resolution 4 is good for zooming out over a country.
      // If we use higher resolutions, the browser will freeze when rendering huge bounds.
      // For geofences, we render them specifically. For the background grid, we use a fixed resolution.
      const backgroundCells = polygonToCells(bounds, 4, true);
      
      // Merge with restricted cells (which are probably res 9)
      const allCells = new Set([...backgroundCells, ...restrictedCells]);
      
      return Array.from(allCells).map(cell => {
        const boundary = cellToBoundary(cell);
        const isRestricted = restrictedCells.includes(cell);
        return {
          id: cell,
          positions: boundary as [number, number][],
          isRestricted
        };
      });
    } catch (e) {
      console.error("Error generating H3 grid", e);
      return [];
    }
  }, [showH3Grid, bounds, restrictedCells]);

  if (!showH3Grid) return null;

  return (
    <>
      {cells.map(cell => (
        <Polygon
          key={cell.id}
          positions={cell.positions}
          pathOptions={{
            color: cell.isRestricted ? '#ff0000' : '#4a5568',
            weight: cell.isRestricted ? 2 : 1,
            fillColor: cell.isRestricted ? '#ff0000' : 'transparent',
            fillOpacity: cell.isRestricted ? 0.4 : 0,
            dashArray: cell.isRestricted ? undefined : '2, 4',
          }}
          eventHandlers={{
            mouseover: (e) => {
              const layer = e.target;
              layer.setStyle({
                fillColor: cell.isRestricted ? '#ff0000' : '#ffffff',
                fillOpacity: cell.isRestricted ? 0.6 : 0.2
              });
            },
            mouseout: (e) => {
              const layer = e.target;
              layer.setStyle({
                fillColor: cell.isRestricted ? '#ff0000' : 'transparent',
                fillOpacity: cell.isRestricted ? 0.4 : 0
              });
            }
          }}
        />
      ))}
    </>
  );
};
