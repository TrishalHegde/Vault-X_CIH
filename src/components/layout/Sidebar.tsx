import React, { useState } from 'react';
import { useEngineStore } from '../../store/useEngineStore';

type Tab = 'incident' | 'active' | 'port' | 'coastal' | 'fleet' | 'zones';

export const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const vessels = useEngineStore(state => state.vessels);
  const activeThreats = useEngineStore(state => state.activeThreats);
  const showH3Grid = useEngineStore(state => state.settings.showH3Grid);
  const toggleH3Grid = useEngineStore(state => state.actions.toggleH3Grid);
  const restrictedCells = useEngineStore(state => state.restrictedCells);

  const tabs: { id: Tab; icon: string; label: string; alert?: number }[] = [
    { id: 'incident', icon: 'warning', label: 'Incident Feed', alert: activeThreats.length },
    { id: 'active', icon: 'anchor', label: 'Active Ops' },
    { id: 'port', icon: 'lan', label: 'Port Ops' },
    { id: 'zones', icon: 'gpp_bad', label: 'Restricted Zones' },
    { id: 'coastal', icon: 'shield', label: 'Coastal Prot' },
    { id: 'fleet', icon: 'radar', label: 'Fleet Intel' },
  ];

  return (
    <nav className="fixed left-0 top-[48px] bottom-[48px] w-[320px] z-40 flex flex-col border-r border-outline-variant backdrop-blur-xl bg-surface-container-low/85 dark:bg-surface-container-low/85 transition-all duration-200 ease-in-out">
      {/* Header */}
      <div className="p-panel-padding border-b border-outline-variant flex items-center gap-3">
        <div className="w-10 h-10 bg-surface-container-highest border border-outline-variant flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary-fixed-dim">radar</span>
        </div>
        <div className="flex flex-col">
          <span className="font-headline-sm text-headline-sm text-primary-fixed-dim truncate">SECTOR 7</span>
          <span className="font-label-caps text-label-caps text-on-surface-variant text-[10px] uppercase tracking-widest">High Readiness</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="py-2 flex flex-col gap-1 px-2 border-b border-outline-variant">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 transition-all duration-200 ease-in-out ${
              activeTab === tab.id
                ? 'text-primary-fixed-dim border-l-2 border-primary-fixed-dim bg-primary-fixed-dim/10 glow-active font-bold'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={activeTab === tab.id ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {tab.icon}
            </span>
            <span className="font-label-caps text-label-caps tracking-widest uppercase">{tab.label}</span>
            {tab.alert && (
              <span className="ml-auto bg-error text-on-error font-data-tabular text-[10px] px-1.5 py-0.5 rounded-DEFAULT">
                {tab.alert}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Dynamic Content Area based on Tab */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {activeTab === 'incident' && (
          <div className="flex flex-col gap-4">
            <h3 className="font-label-caps text-outline uppercase tracking-widest text-[10px] mb-2">Live Incident Feed</h3>
            {activeThreats.length === 0 ? (
              <div className="text-on-surface-variant text-[12px] italic">No active incidents.</div>
            ) : (
              activeThreats.map(inc => (
                <div key={inc.id} className={`border p-3 rounded-sm ${inc.severity === 'CRITICAL' ? 'border-error/50 bg-error/10 pulse-critical' : 'border-primary-fixed-dim/50 bg-surface-container-highest'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`font-data-tabular text-[12px] font-bold ${inc.severity === 'CRITICAL' ? 'text-error' : 'text-primary-fixed-dim'}`}>{inc.timestamp}</span>
                    <span className={`${inc.severity === 'CRITICAL' ? 'bg-error text-on-error' : 'bg-outline text-on-surface'} px-1 text-[9px] font-bold rounded`}>{inc.severity}</span>
                  </div>
                  <p className="font-body-md text-on-surface text-[13px] mb-1">{inc.type}</p>
                  <p className="font-data-tabular text-outline text-[11px]">Vessel: {inc.vesselName}</p>
                  <p className="font-data-tabular text-outline text-[11px]">Loc: {inc.location}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'active' && (
          <div className="flex flex-col gap-2">
            <span className="font-label-caps text-label-caps text-on-surface-variant">SECTOR TRAFFIC (MESSAGES/SEC)</span>
            <div className="flex items-end gap-2 h-16 mt-2 mb-4 border-b border-outline-variant pb-2">
              <div className="w-3 bg-outline-variant h-[30%]"></div>
              <div className="w-3 bg-outline-variant h-[50%]"></div>
              <div className="w-3 bg-outline-variant h-[40%]"></div>
              <div className="w-3 bg-outline-variant h-[70%]"></div>
              <div className="w-3 bg-outline-variant h-[80%]"></div>
              <div className="w-3 bg-outline-variant h-[60%]"></div>
              <div className="w-3 bg-outline-variant h-[50%]"></div>
              <div className="w-3 bg-primary-fixed-dim h-[90%] glow-active"></div>
            </div>
            
            <h3 className="font-label-caps text-outline uppercase tracking-widest text-[10px] mb-2 mt-4">Active Operations</h3>
            {activeThreats.filter(t => t.severity === 'CRITICAL' || t.severity === 'HIGH').length === 0 ? (
              <div className="text-on-surface-variant text-[12px] italic">No active high-risk operations.</div>
            ) : (
              activeThreats.filter(t => t.severity === 'CRITICAL' || t.severity === 'HIGH').slice(0, 3).map(threat => (
                <div key={threat.id} className="p-2 border border-outline-variant bg-surface-container rounded-sm mt-1">
                  <div className="flex justify-between font-data-tabular text-[12px]">
                    <span className="text-on-surface truncate pr-2">Intercept {threat.vesselName}</span>
                    <span className="text-primary-fixed-dim shrink-0">IN PROGRESS</span>
                  </div>
                  <div className="mt-2 h-1 w-full bg-outline-variant rounded overflow-hidden">
                    <div className={`h-full w-[${Math.floor(Math.random() * 60 + 20)}%] ${threat.severity === 'CRITICAL' ? 'bg-error' : 'bg-primary-fixed-dim'}`}></div>
                  </div>
                  <p className="font-data-tabular text-outline text-[10px] mt-1">Target: {threat.type}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'port' && (
          <div className="flex flex-col gap-4">
             <h3 className="font-label-caps text-outline uppercase tracking-widest text-[10px] mb-2">Port Operations</h3>
             <div className="grid grid-cols-2 gap-2">
               <div className="bg-surface-container-highest p-2 border border-outline-variant rounded-sm flex flex-col">
                  <span className="font-data-tabular text-[20px] text-primary-fixed-dim font-bold">{vessels.filter(v => v.destinationPort).length}</span>
                  <span className="font-label-caps text-outline">Arrivals En Route</span>
               </div>
               <div className="bg-surface-container-highest p-2 border border-outline-variant rounded-sm flex flex-col">
                  <span className="font-data-tabular text-[20px] text-on-surface font-bold">{vessels.filter(v => v.originPort).length}</span>
                  <span className="font-label-caps text-outline">Recent Departures</span>
               </div>
               <div className="bg-surface-container-highest p-2 border border-outline-variant rounded-sm flex flex-col col-span-2">
                  <span className="font-data-tabular text-[20px] text-error font-bold">{Math.min(100, Math.floor((vessels.length / 500) * 100))}%</span>
                  <span className="font-label-caps text-outline">Est. Berth Occupancy</span>
               </div>
             </div>
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="flex flex-col gap-4">
             <h3 className="font-label-caps text-outline uppercase tracking-widest text-[10px] mb-2">Fleet Intelligence</h3>
             <div className="flex flex-col gap-2 text-sm text-on-surface">
               <div className="flex justify-between"><span>Cargo Ships</span><span className="font-data-tabular">{vessels.filter(v => v.type === 'cargo').length}</span></div>
               <div className="flex justify-between"><span>Tankers</span><span className="font-data-tabular">{vessels.filter(v => v.type === 'tanker').length}</span></div>
               <div className="flex justify-between"><span>Fishing</span><span className="font-data-tabular">{vessels.filter(v => v.type === 'fishing').length}</span></div>
               <div className="flex justify-between"><span>Military/Patrol</span><span className="font-data-tabular">{vessels.filter(v => ['military','patrol'].includes(v.type)).length}</span></div>
               <div className="flex justify-between text-error font-bold"><span>High Risk</span><span className="font-data-tabular">{vessels.filter(v => v.risk === 'high').length}</span></div>
             </div>
          </div>
        )}

        {activeTab === 'zones' && (
          <div className="flex flex-col gap-4">
             <div className="flex justify-between items-center mb-2 border-b border-outline-variant pb-2">
               <h3 className="font-label-caps text-outline uppercase tracking-widest text-[10px]">Restricted Zones</h3>
               <button 
                 onClick={toggleH3Grid}
                 className={`font-label-caps text-[10px] px-2 py-1 border rounded transition-colors ${showH3Grid ? 'bg-primary-fixed-dim text-surface-container border-primary-fixed-dim' : 'text-primary-fixed-dim border-primary-fixed-dim'}`}
               >
                 {showH3Grid ? 'Hide H3 Grid' : 'Show H3 Grid'}
               </button>
             </div>
             
             {/* Note: The backend should ideally provide zone objects, but since Step 4 requires UI rendering, 
                 we will mock the zone list layout for now, and connect if backend provides it */}
             <div className="bg-surface-container-highest p-3 border border-error/50 rounded-sm flex flex-col gap-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-8 h-8 bg-error/10 flex items-center justify-center rounded-bl-lg">
                   <span className="material-symbols-outlined text-[14px] text-error">warning</span>
                </div>
                <span className="font-bold text-on-surface text-[14px]">Gulf of Mannar</span>
                <span className="font-label-caps text-outline text-[10px] uppercase">Ecological Zone</span>
                <div className="grid grid-cols-2 gap-y-2 mt-2 font-data-tabular text-[11px]">
                  <div className="flex flex-col"><span className="text-outline">Max Speed</span><span className="text-primary-fixed-dim">10 Knots</span></div>
                  <div className="flex flex-col"><span className="text-outline">H3 Cells</span><span className="text-on-surface">{restrictedCells.length > 0 ? restrictedCells.length : 142}</span></div>
                  <div className="flex flex-col"><span className="text-outline">Active Vessels</span><span className="text-on-surface">12</span></div>
                  <div className="flex flex-col"><span className="text-outline">Violations</span><span className="text-error font-bold">{activeThreats.filter(i => i.type.includes('Speed')).length}</span></div>
                </div>
             </div>
             
             <div className="bg-surface-container-highest p-3 border border-outline-variant rounded-sm flex flex-col gap-1">
                <span className="font-bold text-on-surface text-[14px]">Sundarbans Waters</span>
                <span className="font-label-caps text-outline text-[10px] uppercase">Ecological Zone</span>
                <div className="grid grid-cols-2 gap-y-2 mt-2 font-data-tabular text-[11px]">
                  <div className="flex flex-col"><span className="text-outline">Max Speed</span><span className="text-primary-fixed-dim">8 Knots</span></div>
                  <div className="flex flex-col"><span className="text-outline">H3 Cells</span><span className="text-on-surface">84</span></div>
                  <div className="flex flex-col"><span className="text-outline">Active Vessels</span><span className="text-on-surface">5</span></div>
                  <div className="flex flex-col"><span className="text-outline">Violations</span><span className="text-on-surface">0</span></div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Footer Settings Tabs */}
      <div className="mt-auto border-t border-outline-variant p-2 flex flex-col gap-1">
        <button 
          onClick={() => alert("System Configuration panel is locked for standard operators. Please contact Administrator.")}
          className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-200 ease-in-out"
        >
          <span className="material-symbols-outlined text-[18px]">settings</span>
          <span className="font-label-caps text-label-caps tracking-widest uppercase">System Config</span>
        </button>
      </div>
    </nav>
  );
};
