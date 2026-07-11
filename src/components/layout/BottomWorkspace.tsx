import React, { useState } from 'react';
import { useEngineStore } from '../../store/useEngineStore';

type Tab = 'table' | 'simulation' | 'performance' | 'health';

export const BottomWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('table');
  const vessels = useEngineStore(state => state.vessels);
  const stats = useEngineStore(state => state.stats);
  const simulation = useEngineStore(state => state.simulation);
  const toggleSimulation = useEngineStore(state => state.actions.toggleSimulation);
  const setSelectedVessel = useEngineStore(state => state.actions.setSelectedVessel);
  
  const tabs = [
    { id: 'table', icon: 'table_rows', label: 'VESSEL INTELLIGENCE' },
    { id: 'simulation', icon: 'joystick', label: 'SIMULATION' },
    { id: 'performance', icon: 'speed', label: 'PERFORMANCE' },
    { id: 'health', icon: 'medical_services', label: 'SYSTEM HEALTH' },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto bg-surface-container-low/95 backdrop-blur-xl border-t border-outline-variant flex flex-col h-[320px]">
      {/* Tab Header */}
      <div className="flex border-b border-outline-variant bg-surface-container-lowest overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`px-6 py-2 border-b-2 font-label-caps text-label-caps flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary-fixed-dim text-primary-fixed-dim bg-primary-fixed-dim/5'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex items-center px-4 gap-4 shrink-0">
          <span className="font-data-tabular text-[10px] text-outline">FILTER: NONE</span>
          <button className="text-on-surface-variant hover:text-primary-fixed-dim"><span className="material-symbols-outlined text-[18px]">filter_list</span></button>
          <button className="text-on-surface-variant hover:text-primary-fixed-dim"><span className="material-symbols-outlined text-[18px]">open_in_full</span></button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto relative">
        {activeTab === 'table' && (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-surface-container-high border-b border-outline-variant z-10">
              <tr>
                <th className="font-label-caps text-label-caps text-outline py-2 px-4 w-12">STATUS</th>
                <th className="font-label-caps text-label-caps text-outline py-2 px-4">MMSI / ID</th>
                <th className="font-label-caps text-label-caps text-outline py-2 px-4">VESSEL NAME</th>
                <th className="font-label-caps text-label-caps text-outline py-2 px-4">TYPE</th>
                <th className="font-label-caps text-label-caps text-outline py-2 px-4 text-right">SPEED (kn)</th>
                <th className="font-label-caps text-label-caps text-outline py-2 px-4">RISK</th>
              </tr>
            </thead>
            <tbody className="font-data-tabular text-data-tabular text-on-surface divide-y divide-outline-variant/50">
              {vessels.slice(0, 100).map(v => (
                <tr key={v.id} onClick={() => setSelectedVessel(v.id)} className={`hover:bg-surface-container-highest cursor-pointer transition-colors ${v.risk === 'high' ? 'bg-error/5' : ''}`}>
                  <td className="py-1.5 px-4"><div className={`w-2 h-2 rounded-full mx-auto ${v.risk === 'high' ? 'bg-error pulse-critical' : 'bg-primary-fixed-dim glow-active'}`}></div></td>
                  <td className={`py-1.5 px-4 ${v.risk === 'high' ? 'text-error' : 'text-primary-fixed-dim'}`}>{v.mmsi || v.id}</td>
                  <td className={`py-1.5 px-4 ${v.risk === 'high' ? 'text-error' : 'font-bold text-primary-fixed-dim'}`}>{v.name}</td>
                  <td className="py-1.5 px-4 text-on-surface-variant capitalize">{v.type}</td>
                  <td className="py-1.5 px-4 text-right">{v.speed.toFixed(1)}</td>
                  <td className={`py-1.5 px-4 uppercase ${v.risk === 'high' ? 'text-error' : 'text-outline'}`}>{v.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'performance' && (
          <div className="p-4 grid grid-cols-4 gap-4">
            <div className="border border-outline-variant p-4 bg-surface-container">
              <span className="font-label-caps text-outline uppercase">Current Throughput</span>
              <div className="font-data-tabular text-[24px] text-primary-fixed-dim font-bold mt-2">{stats.msgPerSec.toLocaleString()} <span className="text-[12px] text-outline">msg/s</span></div>
            </div>
            <div className="border border-outline-variant p-4 bg-surface-container">
              <span className="font-label-caps text-outline uppercase">Average Latency</span>
              <div className="font-data-tabular text-[24px] text-on-surface font-bold mt-2">{stats.latency} <span className="text-[12px] text-outline">ms</span></div>
            </div>
            <div className="border border-outline-variant p-4 bg-surface-container">
              <span className="font-label-caps text-outline uppercase">Active Threats</span>
              <div className="font-data-tabular text-[24px] text-error font-bold mt-2">{stats.activeThreats}</div>
            </div>
            <div className="border border-outline-variant p-4 bg-surface-container">
              <span className="font-label-caps text-outline uppercase">Uptime</span>
              <div className="font-data-tabular text-[24px] text-primary-fixed-dim font-bold mt-2">{stats.uptime}</div>
            </div>
          </div>
        )}

        {activeTab === 'simulation' && (
          <div className="p-4">
            <h3 className="font-label-caps text-outline uppercase mb-4">Tactical Simulation Controls</h3>
            <div className="flex gap-4 mb-4">
              <button 
                onClick={toggleSimulation}
                className={`border px-4 py-2 font-label-caps transition-colors ${simulation.isRunning ? 'bg-error/10 border-error text-error hover:bg-error hover:text-on-error' : 'bg-primary-fixed-dim/10 border-primary-fixed-dim text-primary-fixed-dim hover:bg-primary-fixed-dim hover:text-on-primary'}`}
              >
                {simulation.isRunning ? 'PAUSE ENGINE' : 'START ENGINE'}
              </button>
            </div>
            <div className="flex gap-4">
              <button className="bg-error/10 border border-error text-error px-4 py-2 font-label-caps hover:bg-error hover:text-on-error transition-colors">
                TRIGGER DARK FLEET
              </button>
              <button className="bg-surface-container-highest border border-outline-variant text-on-surface px-4 py-2 font-label-caps hover:border-primary-fixed-dim transition-colors">
                SIMULATE OIL SPILL
              </button>
              <button className="bg-surface-container-highest border border-outline-variant text-on-surface px-4 py-2 font-label-caps hover:border-primary-fixed-dim transition-colors">
                SPAWN RENDEZVOUS
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
