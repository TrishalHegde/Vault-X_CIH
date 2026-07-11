import React, { useState } from 'react';
import { useEngineStore } from '../../store/useEngineStore';

type Tab = 'table' | 'simulation' | 'performance' | 'health' | 'darkFleet' | 'rendezvous' | 'topRisk';

export const BottomWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('table');
  const vessels = useEngineStore(state => state.vessels);
  const stats = useEngineStore(state => state.stats);
  const activeThreats = useEngineStore(state => state.activeThreats);
  const threatHistory = useEngineStore(state => state.threatHistory);
  const simulation = useEngineStore(state => state.simulation);
  const toggleSimulation = useEngineStore(state => state.actions.toggleSimulation);
  const setSelectedVessel = useEngineStore(state => state.actions.setSelectedVessel);
  
  const tabs = [
    { id: 'table', icon: 'table_rows', label: 'VESSEL INTELLIGENCE' },
    { id: 'simulation', icon: 'joystick', label: 'SIMULATION' },
    { id: 'performance', icon: 'speed', label: 'PERFORMANCE' },
    { id: 'health', icon: 'medical_services', label: 'SYSTEM HEALTH' },
    { id: 'darkFleet', icon: 'visibility_off', label: 'DARK FLEET' },
    { id: 'rendezvous', icon: 'hub', label: 'RENDEZVOUS' },
    { id: 'topRisk', icon: 'warning', label: 'TOP RISK VESSELS' },
  ];

  const getRiskColor = (risk: string) => {
    switch(risk) {
      case 'critical': return 'text-error font-bold';
      case 'high': return 'text-[#ffb339] font-bold';
      case 'medium': return 'text-primary-fixed-dim';
      default: return 'text-outline';
    }
  };

  const topRiskVessels = [...vessels].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0)).slice(0, 10);
  const darkFleetAlerts = activeThreats.filter(a => a.type === 'Dark Fleet');
  const rendezvousAlerts = activeThreats.filter(a => a.type === 'Rendezvous');

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
                <tr key={v.id} onClick={() => setSelectedVessel(v.id)} className={`hover:bg-surface-container-highest cursor-pointer transition-colors ${v.risk === 'critical' ? 'bg-error/5' : ''}`}>
                  <td className="py-1.5 px-4"><div className={`w-2 h-2 rounded-full mx-auto ${v.risk === 'critical' ? 'bg-error pulse-critical' : 'bg-primary-fixed-dim glow-active'}`}></div></td>
                  <td className={`py-1.5 px-4 ${getRiskColor(v.risk)}`}>{v.mmsi || v.id}</td>
                  <td className={`py-1.5 px-4 ${getRiskColor(v.risk)}`}>{v.name}</td>
                  <td className="py-1.5 px-4 text-on-surface-variant capitalize">{v.type}</td>
                  <td className="py-1.5 px-4 text-right">{v.speed.toFixed(1)}</td>
                  <td className={`py-1.5 px-4 uppercase ${getRiskColor(v.risk)}`}>{v.riskScore || 0} ({v.risk})</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'performance' && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-4 grid grid-cols-4 gap-4 shrink-0">
              <div className="border border-outline-variant p-4 bg-surface-container">
                <span className="font-label-caps text-outline uppercase">Current Throughput</span>
                <div className="font-data-tabular text-[24px] text-primary-fixed-dim font-bold mt-2">{stats.msgPerSec.toLocaleString()} <span className="text-[12px] text-outline">msg/s</span></div>
              </div>
              <div className="border border-outline-variant p-4 bg-surface-container">
                <span className="font-label-caps text-outline uppercase">Average Latency</span>
                <div className="font-data-tabular text-[24px] text-on-surface font-bold mt-2">{stats.latency.toFixed(2)} <span className="text-[12px] text-outline">ms</span></div>
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
            
            <div className="flex-1 grid grid-cols-2 gap-4 px-4 pb-4 min-h-[200px] overflow-hidden">
              <div className="flex flex-col border border-outline-variant bg-surface-container overflow-hidden">
                <div className="p-2 border-b border-outline-variant bg-surface-container-highest font-label-caps text-outline">ACTIVE THREATS</div>
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-surface-container-high border-b border-outline-variant z-10">
                      <tr>
                        <th className="font-label-caps text-label-caps text-outline py-2 px-4">SEV</th>
                        <th className="font-label-caps text-label-caps text-outline py-2 px-4">TIME</th>
                        <th className="font-label-caps text-label-caps text-outline py-2 px-4">VESSEL</th>
                        <th className="font-label-caps text-label-caps text-outline py-2 px-4">RULE</th>
                        <th className="font-label-caps text-label-caps text-outline py-2 px-4">LOC</th>
                      </tr>
                    </thead>
                    <tbody className="font-data-tabular text-[11px] text-on-surface divide-y divide-outline-variant/50">
                      {activeThreats.map(t => (
                        <tr key={t.id} onClick={() => setSelectedVessel(t.vesselId)} className="hover:bg-surface-container-highest cursor-pointer">
                          <td className={`py-1.5 px-4 font-bold ${t.severity === 'CRITICAL' ? 'text-error' : 'text-primary-fixed-dim'}`}>{t.severity}</td>
                          <td className="py-1.5 px-4 text-outline">{t.timestamp}</td>
                          <td className="py-1.5 px-4 text-on-surface-variant">{t.vesselName}</td>
                          <td className="py-1.5 px-4">{t.type}</td>
                          <td className="py-1.5 px-4">{t.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex flex-col border border-outline-variant bg-surface-container overflow-hidden">
                <div className="p-2 border-b border-outline-variant bg-surface-container-highest font-label-caps text-outline">THREAT HISTORY (RESOLVED)</div>
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-surface-container-high border-b border-outline-variant z-10">
                      <tr>
                        <th className="font-label-caps text-label-caps text-outline py-2 px-4">SEV</th>
                        <th className="font-label-caps text-label-caps text-outline py-2 px-4">TIME</th>
                        <th className="font-label-caps text-label-caps text-outline py-2 px-4">VESSEL</th>
                        <th className="font-label-caps text-label-caps text-outline py-2 px-4">RULE</th>
                        <th className="font-label-caps text-label-caps text-outline py-2 px-4">LOC</th>
                      </tr>
                    </thead>
                    <tbody className="font-data-tabular text-[11px] text-on-surface divide-y divide-outline-variant/50 opacity-70">
                      {threatHistory.map(t => (
                        <tr key={t.id} onClick={() => setSelectedVessel(t.vesselId)} className="hover:bg-surface-container-highest cursor-pointer">
                          <td className={`py-1.5 px-4 font-bold ${t.severity === 'CRITICAL' ? 'text-error' : 'text-primary-fixed-dim'}`}>{t.severity}</td>
                          <td className="py-1.5 px-4 text-outline">{t.timestamp}</td>
                          <td className="py-1.5 px-4 text-on-surface-variant">{t.vesselName}</td>
                          <td className="py-1.5 px-4">{t.type}</td>
                          <td className="py-1.5 px-4">{t.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'darkFleet' && (
          <div className="p-4 h-full overflow-hidden flex flex-col">
            <h3 className="font-label-caps text-outline uppercase mb-2">Dark Fleet Anomalies</h3>
            <div className="flex-1 overflow-y-auto border border-outline-variant bg-surface-container">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface-container-high border-b border-outline-variant z-10">
                  <tr>
                    <th className="font-label-caps text-label-caps text-outline py-2 px-4">SEVERITY</th>
                    <th className="font-label-caps text-label-caps text-outline py-2 px-4">TIME</th>
                    <th className="font-label-caps text-label-caps text-outline py-2 px-4">VESSEL</th>
                    <th className="font-label-caps text-label-caps text-outline py-2 px-4">LAST LOCATION</th>
                  </tr>
                </thead>
                <tbody className="font-data-tabular text-[13px] text-on-surface divide-y divide-outline-variant/50">
                  {darkFleetAlerts.length === 0 ? (
                    <tr><td colSpan={4} className="py-4 text-center text-outline">No active Dark Fleet anomalies</td></tr>
                  ) : (
                    darkFleetAlerts.map(t => (
                      <tr key={t.id} onClick={() => setSelectedVessel(t.vesselId)} className="hover:bg-surface-container-highest cursor-pointer">
                        <td className={`py-2 px-4 font-bold ${t.severity === 'CRITICAL' ? 'text-error' : 'text-primary-fixed-dim'}`}>{t.severity}</td>
                        <td className="py-2 px-4 text-outline">{t.timestamp}</td>
                        <td className="py-2 px-4 text-on-surface-variant">{t.vesselName}</td>
                        <td className="py-2 px-4">{t.location}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'rendezvous' && (
          <div className="p-4 h-full overflow-hidden flex flex-col">
            <h3 className="font-label-caps text-outline uppercase mb-2">Rendezvous Suspicions</h3>
            <div className="flex-1 overflow-y-auto border border-outline-variant bg-surface-container">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface-container-high border-b border-outline-variant z-10">
                  <tr>
                    <th className="font-label-caps text-label-caps text-outline py-2 px-4">SEVERITY</th>
                    <th className="font-label-caps text-label-caps text-outline py-2 px-4">TIME</th>
                    <th className="font-label-caps text-label-caps text-outline py-2 px-4">INVOLVED VESSELS</th>
                    <th className="font-label-caps text-label-caps text-outline py-2 px-4">H3 CELL ID</th>
                  </tr>
                </thead>
                <tbody className="font-data-tabular text-[13px] text-on-surface divide-y divide-outline-variant/50">
                  {rendezvousAlerts.length === 0 ? (
                    <tr><td colSpan={4} className="py-4 text-center text-outline">No active Rendezvous events</td></tr>
                  ) : (
                    rendezvousAlerts.map(t => (
                      <tr key={t.id} className="hover:bg-surface-container-highest cursor-pointer">
                        <td className={`py-2 px-4 font-bold ${t.severity === 'CRITICAL' ? 'text-error' : 'text-primary-fixed-dim'}`}>{t.severity}</td>
                        <td className="py-2 px-4 text-outline">{t.timestamp}</td>
                        <td className="py-2 px-4 text-on-surface-variant max-w-[200px] truncate">{t.vesselId}</td>
                        <td className="py-2 px-4">{t.location}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'topRisk' && (
          <div className="p-4 h-full overflow-hidden flex flex-col">
            <h3 className="font-label-caps text-outline uppercase mb-2">Top Risk Vessels</h3>
            <div className="flex-1 overflow-y-auto border border-outline-variant bg-surface-container">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface-container-high border-b border-outline-variant z-10">
                  <tr>
                    <th className="font-label-caps text-label-caps text-outline py-2 px-4">RISK SCORE</th>
                    <th className="font-label-caps text-label-caps text-outline py-2 px-4">VESSEL NAME</th>
                    <th className="font-label-caps text-label-caps text-outline py-2 px-4">TYPE</th>
                    <th className="font-label-caps text-label-caps text-outline py-2 px-4">SPEED (kn)</th>
                  </tr>
                </thead>
                <tbody className="font-data-tabular text-[13px] text-on-surface divide-y divide-outline-variant/50">
                  {topRiskVessels.map(v => (
                    <tr key={v.id} onClick={() => setSelectedVessel(v.id)} className={`hover:bg-surface-container-highest cursor-pointer ${v.risk === 'critical' ? 'bg-error/5' : ''}`}>
                      <td className={`py-2 px-4 font-bold ${getRiskColor(v.risk)}`}>{v.riskScore || 0}</td>
                      <td className={`py-2 px-4 ${getRiskColor(v.risk)}`}>{v.name}</td>
                      <td className="py-2 px-4 text-on-surface-variant capitalize">{v.type}</td>
                      <td className="py-2 px-4">{v.speed.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'simulation' && (
          <div className="p-4">
            <h3 className="font-label-caps text-outline uppercase mb-4">Tactical Simulation Controls</h3>
            <div className="flex gap-4 mb-4">
              <button 
                onClick={toggleSimulation}
                className={`border px-4 py-2 font-label-caps transition-colors ${!simulation.isRunning ? 'bg-error/10 border-error text-error hover:bg-error hover:text-on-error' : 'bg-primary-fixed-dim/10 border-primary-fixed-dim text-primary-fixed-dim hover:bg-primary-fixed-dim hover:text-on-primary'}`}
              >
                {!simulation.isRunning ? 'PAUSE UI SYNC' : 'START UI SYNC'}
              </button>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => fetch('http://localhost:3000/api/simulation/dark-fleet', { method: 'POST' })}
                className="bg-error/10 border border-error text-error px-4 py-2 font-label-caps hover:bg-error hover:text-on-error transition-colors">
                TRIGGER DARK FLEET
              </button>
              <button 
                onClick={() => fetch('http://localhost:3000/api/simulation/force-stop', { method: 'POST' })}
                className="bg-surface-container-highest border border-outline-variant text-on-surface px-4 py-2 font-label-caps hover:border-primary-fixed-dim transition-colors">
                TRIGGER STATIONARY
              </button>
              <button 
                onClick={() => fetch('http://localhost:3000/api/simulation/rapid-heading', { method: 'POST' })}
                className="bg-surface-container-highest border border-outline-variant text-on-surface px-4 py-2 font-label-caps hover:border-primary-fixed-dim transition-colors">
                TRIGGER REDIRECTION
              </button>
              <button 
                onClick={() => fetch('http://localhost:3000/api/simulation/rendezvous', { method: 'POST' })}
                className="bg-surface-container-highest border border-outline-variant text-on-surface px-4 py-2 font-label-caps hover:border-primary-fixed-dim transition-colors">
                SPAWN RENDEZVOUS
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
