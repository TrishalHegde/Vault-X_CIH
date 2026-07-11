import React from 'react';
import { useEngineStore } from '../../store/useEngineStore';

export const VesselDrawer: React.FC = () => {
  const selectedVesselId = useEngineStore(state => state.selectedVessel);
  const setSelectedVessel = useEngineStore(state => state.actions.setSelectedVessel);
  const vessel = useEngineStore(state => state.vessels.find(v => v.id === selectedVesselId));

  if (!vessel) return null;

  return (
    <div className="absolute right-0 top-0 bottom-[320px] pointer-events-auto w-[380px] bg-surface-container-low/90 backdrop-blur-xl border-l border-b border-primary-fixed-dim shadow-[-8px_0_24px_rgba(0,0,0,0.5)] glow-active flex flex-col z-30 transition-transform duration-300">
      <div className="p-4 border-b border-outline-variant bg-surface-container-highest/50 flex justify-between items-start">
        <div>
          <h2 className={`font-headline-sm text-headline-sm tracking-wider ${vessel.risk === 'high' ? 'text-error' : 'text-primary-fixed-dim'}`}>{vessel.name}</h2>
          <div className="font-label-caps text-label-caps text-on-surface-variant mt-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${vessel.risk === 'high' ? 'bg-error pulse-critical' : 'bg-primary-fixed-dim glow-active'}`}></span>
            TRACKING ACTIVE
          </div>
        </div>
        <button onClick={() => setSelectedVessel(null)} className="text-on-surface-variant hover:text-primary-fixed-dim transition-colors p-1">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      
      <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-4 font-data-tabular text-data-tabular overflow-y-auto">
        <div className="flex flex-col">
          <span className="font-label-caps text-label-caps text-outline mb-1">MMSI</span>
          <span className="text-on-surface text-[14px]">{vessel.mmsi}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-caps text-label-caps text-outline mb-1">IMO NUMBER</span>
          <span className="text-on-surface text-[14px]">{parseInt(vessel.mmsi) + 12431}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-caps text-label-caps text-outline mb-1">LATITUDE</span>
          <span className="text-on-surface text-[14px]">{vessel.lat.toFixed(4)}° N</span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-caps text-label-caps text-outline mb-1">LONGITUDE</span>
          <span className="text-on-surface text-[14px]">{vessel.lng.toFixed(4)}° E</span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-caps text-label-caps text-outline mb-1">TYPE</span>
          <span className="text-on-surface text-[14px] truncate capitalize">{vessel.type}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-caps text-label-caps text-outline mb-1">SPEED</span>
          <span className={`text-[14px] ${vessel.risk === 'high' ? 'text-error pulse-critical' : 'text-primary-fixed-dim glow-active'}`}>{vessel.speed.toFixed(1)} kn</span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-caps text-label-caps text-outline mb-1">HEADING</span>
          <span className="text-on-surface text-[14px]">{vessel.heading.toString().padStart(3, '0')}°</span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-caps text-label-caps text-outline mb-1">COURSE (COG)</span>
          <span className="text-on-surface text-[14px]">{vessel.heading.toString().padStart(3, '0')}°</span>
        </div>
        <div className="flex flex-col col-span-2">
          <span className="font-label-caps text-label-caps text-outline mb-1">DESTINATION</span>
          <span className="text-on-surface text-[14px] truncate">ROTTERDAM [NL] -&gt; ETA 14:00Z</span>
        </div>

        <div className="col-span-2 my-2 h-px bg-outline-variant/50"></div>

        <div className="flex flex-col col-span-2">
          <span className="font-label-caps text-label-caps text-outline mb-1">CURRENT ZONE</span>
          <span className="text-primary-fixed-dim text-[14px]">COASTAL SECTOR 7</span>
        </div>
        <div className="flex flex-col col-span-2">
          <span className="font-label-caps text-label-caps text-outline mb-1">LAST TRANSMISSION</span>
          <span className="text-on-surface text-[14px]">{(Math.random() * 2).toFixed(1)}s ago (Class A AIS)</span>
        </div>

        <div className="flex flex-col col-span-2 p-3 bg-surface-container border border-outline-variant rounded-sm mt-2">
          <div className="flex justify-between items-center mb-2">
            <span className="font-label-caps text-label-caps text-outline">THREAT ASSESSMENT</span>
            <span className={`font-bold ${vessel.risk === 'high' ? 'text-error' : 'text-primary-fixed-dim'}`}>
              {vessel.risk === 'high' ? 'CRITICAL RISK' : 'LOW RISK'}
            </span>
          </div>
          <div className="h-1.5 w-full bg-outline-variant rounded overflow-hidden">
             <div className={`h-full ${vessel.risk === 'high' ? 'bg-error w-[95%]' : 'bg-primary-fixed-dim w-[15%]'}`}></div>
          </div>
        </div>
        
        <div className="flex flex-col col-span-2 mt-2">
          <span className="font-label-caps text-label-caps text-outline mb-2">VIOLATION HISTORY</span>
          {vessel.risk === 'high' ? (
            <div className="text-[12px] text-error font-bold italic">Alert: Suspected restricted zone breach.</div>
          ) : (
            <div className="text-[12px] text-on-surface-variant italic">No prior violations recorded in national waters.</div>
          )}
        </div>
      </div>
      
      <div className="p-3 border-t border-outline-variant flex gap-2 mt-auto bg-surface-container-low">
        <button className={`flex-1 bg-surface-container-highest border text-on-surface font-label-caps text-label-caps py-2 transition-colors ${vessel.risk === 'high' ? 'border-error hover:bg-error hover:text-on-error' : 'border-outline-variant hover:border-primary-fixed-dim hover:text-primary-fixed-dim glow-active'}`}>
          {vessel.risk === 'high' ? 'DISPATCH ASSET' : 'INTERROGATE'}
        </button>
        <button className="flex-1 bg-surface-container-highest border border-outline-variant text-on-surface font-label-caps text-label-caps py-2 hover:border-primary-fixed-dim hover:text-primary-fixed-dim transition-colors">PLOT COURSE</button>
      </div>
    </div>
  );
};
