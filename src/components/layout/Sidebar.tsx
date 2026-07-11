import React, { useState } from 'react';

type Tab = 'incident' | 'active' | 'port' | 'coastal' | 'fleet';

export const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('active');

  const tabs: { id: Tab; icon: string; label: string; alert?: number }[] = [
    { id: 'incident', icon: 'warning', label: 'Incident Feed', alert: 3 },
    { id: 'active', icon: 'anchor', label: 'Active Ops' },
    { id: 'port', icon: 'lan', label: 'Port Ops' },
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
            {/* Mock Incident 1 */}
            <div className="border border-error/50 bg-error/10 p-3 rounded-sm pulse-critical">
              <div className="flex justify-between items-start mb-2">
                <span className="font-data-tabular text-error text-[12px] font-bold">14:21:05Z</span>
                <span className="bg-error text-on-error px-1 text-[9px] font-bold rounded">HIGH SEVERITY</span>
              </div>
              <p className="font-body-md text-on-surface text-[13px] mb-1">Restricted Zone Intrusion</p>
              <p className="font-data-tabular text-outline text-[11px]">Vessel: UNKNOWN [Dark Fleet TGT 01]</p>
              <p className="font-data-tabular text-outline text-[11px]">Loc: HAZMAT-99X</p>
            </div>
            {/* Mock Incident 2 */}
            <div className="border border-primary-fixed-dim/50 bg-surface-container-highest p-3 rounded-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="font-data-tabular text-primary-fixed-dim text-[12px] font-bold">14:15:30Z</span>
                <span className="bg-outline text-on-surface px-1 text-[9px] font-bold rounded">WARNING</span>
              </div>
              <p className="font-body-md text-on-surface text-[13px] mb-1">Overspeeding Detection</p>
              <p className="font-data-tabular text-outline text-[11px]">Vessel: MT PACIFIC EXPLORER</p>
              <p className="font-data-tabular text-outline text-[11px]">Speed: 18.2 kn (Limit: 12 kn)</p>
            </div>
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
            <div className="p-2 border border-outline-variant bg-surface-container rounded-sm">
              <div className="flex justify-between font-data-tabular text-[12px]">
                <span className="text-on-surface">Intercept TGT 01</span>
                <span className="text-primary-fixed-dim">IN PROGRESS</span>
              </div>
              <div className="mt-2 h-1 w-full bg-outline-variant rounded overflow-hidden">
                <div className="h-full bg-primary-fixed-dim w-[60%]"></div>
              </div>
              <p className="font-data-tabular text-outline text-[10px] mt-1">CG CUTTER VALIANT en route</p>
            </div>
          </div>
        )}

        {activeTab === 'port' && (
          <div className="flex flex-col gap-4">
             <h3 className="font-label-caps text-outline uppercase tracking-widest text-[10px] mb-2">Port Operations</h3>
             <div className="grid grid-cols-2 gap-2">
               <div className="bg-surface-container-highest p-2 border border-outline-variant rounded-sm flex flex-col">
                  <span className="font-data-tabular text-[20px] text-primary-fixed-dim font-bold">14</span>
                  <span className="font-label-caps text-outline">Arrivals (ETA &lt;2h)</span>
               </div>
               <div className="bg-surface-container-highest p-2 border border-outline-variant rounded-sm flex flex-col">
                  <span className="font-data-tabular text-[20px] text-on-surface font-bold">8</span>
                  <span className="font-label-caps text-outline">Departures</span>
               </div>
               <div className="bg-surface-container-highest p-2 border border-outline-variant rounded-sm flex flex-col col-span-2">
                  <span className="font-data-tabular text-[20px] text-error font-bold">92%</span>
                  <span className="font-label-caps text-outline">Berth Occupancy</span>
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
