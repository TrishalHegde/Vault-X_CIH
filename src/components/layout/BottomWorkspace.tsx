import React, { useState } from 'react';
import { useEngineStore } from '../../store/useEngineStore';

type Tab = 'table' | 'simulation' | 'performance' | 'health' | 'darkFleet' | 'rendezvous' | 'topRisk' | 'stressTest' | 'fishing';

export const BottomWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('table');
  const vessels = useEngineStore(state => state.vessels);
  const stats = useEngineStore(state => state.stats);
  const activeThreats = useEngineStore(state => state.activeThreats);
  const threatHistory = useEngineStore(state => state.threatHistory);
  const simulation = useEngineStore(state => state.simulation);
  const toggleSimulation = useEngineStore(state => state.actions.toggleSimulation);
  const triggerSimulation = useEngineStore(state => state.actions.triggerSimulation);
  const setSelectedVessel = useEngineStore(state => state.actions.setSelectedVessel);
  const fishingAlerts = useEngineStore(state => state.fishingAlerts);
  const stressRunning = useEngineStore(state => state.stressRunning);
  const stressMsgPerSec = useEngineStore(state => state.stressMsgPerSec);
  const stressHistory = useEngineStore(state => state.stressHistory);
  const startStressTest = useEngineStore(state => state.actions.startStressTest);
  const stopStressTest = useEngineStore(state => state.actions.stopStressTest);
  
  const tabs = [
    { id: 'table', icon: 'table_rows', label: 'VESSEL INTELLIGENCE' },
    { id: 'simulation', icon: 'joystick', label: 'SIMULATION' },
    { id: 'performance', icon: 'speed', label: 'PERFORMANCE' },
    { id: 'health', icon: 'medical_services', label: 'SYSTEM HEALTH' },
    { id: 'darkFleet', icon: 'visibility_off', label: 'DARK FLEET' },
    { id: 'rendezvous', icon: 'hub', label: 'RENDEZVOUS' },
    { id: 'topRisk', icon: 'warning', label: 'TOP RISK VESSELS' },
    { id: 'stressTest', icon: 'electric_bolt', label: 'STRESS TEST' },
    { id: 'fishing', icon: 'phishing', label: 'ILLEGAL FISHING' },
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
                className={`border px-4 py-2 font-label-caps transition-colors ${simulation.isRunning ? 'bg-primary-fixed-dim/10 border-primary-fixed-dim text-primary-fixed-dim hover:bg-primary-fixed-dim hover:text-on-primary' : 'bg-error/10 border-error text-error hover:bg-error hover:text-on-error'}`}
              >
                {simulation.isRunning ? 'PAUSE UI SYNC' : 'RESUME UI SYNC'}
              </button>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => triggerSimulation('dark-fleet')}
                className="bg-error/10 border border-error text-error px-4 py-2 font-label-caps hover:bg-error hover:text-on-error transition-colors">
                TRIGGER DARK FLEET
              </button>
              <button 
                onClick={() => triggerSimulation('force-stop')}
                className="bg-surface-container-highest border border-outline-variant text-on-surface px-4 py-2 font-label-caps hover:border-primary-fixed-dim transition-colors">
                TRIGGER STATIONARY
              </button>
              <button 
                onClick={() => triggerSimulation('rapid-heading')}
                className="bg-surface-container-highest border border-outline-variant text-on-surface px-4 py-2 font-label-caps hover:border-primary-fixed-dim transition-colors">
                TRIGGER REDIRECTION
              </button>
              <button 
                onClick={() => triggerSimulation('rendezvous')}
                className="bg-surface-container-highest border border-outline-variant text-on-surface px-4 py-2 font-label-caps hover:border-primary-fixed-dim transition-colors">
                SPAWN RENDEZVOUS
              </button>
            </div>
          </div>
        )}

        {/* ── STRESS TEST TAB ──────────────────────────────────────────── */}
        {activeTab === 'stressTest' && (
          <div className="p-4 font-data-tabular">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-label-caps text-primary-fixed-dim uppercase text-[13px]">50,000 MSG/SEC THROUGHPUT PROOF</h3>
                <p className="text-outline text-[11px] mt-0.5">Blasts 8 parallel UDP streams × 700 vessels into the engine to prove the constraint.</p>
              </div>
              <div className="flex gap-3">
                {!stressRunning ? (
                  <button
                    onClick={startStressTest}
                    className="bg-primary-fixed-dim text-on-primary px-6 py-2 font-label-caps text-[12px] hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">electric_bolt</span>
                    START STRESS TEST
                  </button>
                ) : (
                  <button
                    onClick={stopStressTest}
                    className="bg-error text-on-error px-6 py-2 font-label-caps text-[12px] hover:opacity-90 transition-opacity flex items-center gap-2 animate-pulse"
                  >
                    <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                    STOP TEST
                  </button>
                )}
              </div>
            </div>

            {/* Live Throughput Meter */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-surface-container border border-outline-variant p-4 flex flex-col items-center">
                <div className={`text-[36px] font-black font-data-tabular leading-none mb-1 ${
                  stressMsgPerSec >= 50000 ? 'text-primary-fixed-dim' : stressRunning ? 'text-[#ffb339]' : 'text-outline'
                }`}>
                  {stressMsgPerSec >= 1000 ? `${(stressMsgPerSec / 1000).toFixed(1)}K` : stressMsgPerSec}
                </div>
                <div className="text-[10px] text-outline uppercase tracking-widest">MSG / SEC</div>
                <div className={`mt-2 text-[11px] font-bold px-2 py-0.5 ${
                  stressMsgPerSec >= 50000 ? 'text-primary-fixed-dim bg-primary-fixed-dim/10' :
                  stressRunning ? 'text-[#ffb339] bg-[#ffb339]/10' : 'text-outline'
                }`}>
                  {stressMsgPerSec >= 50000 ? '✅ CONSTRAINT MET' : stressRunning ? '⏳ RAMPING UP...' : '— IDLE'}
                </div>
              </div>
              <div className="bg-surface-container border border-outline-variant p-4 flex flex-col items-center">
                <div className="text-[36px] font-black text-on-surface leading-none mb-1">50K</div>
                <div className="text-[10px] text-outline uppercase tracking-widest">REQUIREMENT</div>
                <div className="mt-2 text-[11px] text-outline">Problem Statement 5</div>
              </div>
              <div className="bg-surface-container border border-outline-variant p-4 flex flex-col items-center">
                <div className={`text-[36px] font-black leading-none mb-1 ${
                  stressMsgPerSec > 0 ? 'text-primary-fixed-dim' : 'text-outline'
                }`}>
                  {stressMsgPerSec > 0 ? `${(stressMsgPerSec / 50000 * 100).toFixed(0)}%` : '0%'}
                </div>
                <div className="text-[10px] text-outline uppercase tracking-widest">OF TARGET</div>
                <div className="mt-2 text-[11px] text-outline">~3 μs per message</div>
              </div>
            </div>

            {/* Throughput progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-[10px] text-outline mb-1">
                <span>0</span><span>25K</span><span>50K TARGET</span><span>100K</span>
              </div>
              <div className="h-3 bg-surface-container-highest border border-outline-variant/50 relative">
                <div
                  className={`h-full transition-all duration-500 ${
                    stressMsgPerSec >= 50000 ? 'bg-primary-fixed-dim' : 'bg-[#ffb339]'
                  }`}
                  style={{ width: `${Math.min(100, stressMsgPerSec / 1000)}%` }}
                />
                {/* 50k marker */}
                <div className="absolute top-0 left-1/2 h-full w-px bg-error/60" />
              </div>
            </div>

            {/* Bar chart history */}
            {stressHistory.length > 0 && (
              <div>
                <div className="text-[10px] text-outline uppercase mb-2">LAST 60 SECONDS — MSG/SEC HISTORY</div>
                <div className="flex items-end gap-px h-[60px] bg-surface-container border border-outline-variant/30 px-1 pt-1">
                  {stressHistory.slice(-60).map((snap, i) => {
                    const pct = Math.min(100, snap.msgPerSec / 1000);
                    return (
                      <div
                        key={i}
                        className={`flex-1 transition-all duration-200 ${
                          snap.msgPerSec >= 50000 ? 'bg-primary-fixed-dim' : 'bg-[#ffb339]/70'
                        }`}
                        style={{ height: `${pct}%`, minHeight: pct > 0 ? '2px' : '0' }}
                        title={`${snap.msgPerSec.toLocaleString()} msg/s`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Architecture explanation */}
            <div className="mt-4 bg-surface-container border border-outline-variant/30 p-3 text-[11px] text-on-surface-variant">
              <div className="font-bold text-primary-fixed-dim mb-1 uppercase tracking-wider text-[10px]">How it works</div>
              <div className="grid grid-cols-2 gap-2">
                <div>🔒 <strong>RoaringTreemap</strong> — true u64 H3 cell lookup (no hash collisions)</div>
                <div>⚡ <strong>H3 O(1)</strong> — ~100ns per spatial check</div>
                <div>🔄 <strong>8 worker threads</strong> — lock-free crossbeam ring buffer</div>
                <div>📡 <strong>8 blaster tasks</strong> — internal UDP self-blast at 50k+ msg/s</div>
              </div>
            </div>
          </div>
        )}

        {/* ── ILLEGAL FISHING TAB ──────────────────────────────────────── */}
        {activeTab === 'fishing' && (
          <div className="p-4 font-data-tabular">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-label-caps text-error uppercase text-[13px]">ILLEGAL FISHING DETECTION</h3>
                <p className="text-outline text-[11px] mt-0.5">
                  Real-time detection of MPA breaches, trawling activity, AIS manipulation, and fleet rendezvous.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 border border-error/40 px-3 py-1 bg-error/5">
                  <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
                  <span className="text-error text-[11px] font-bold">{fishingAlerts.length} ACTIVE VIOLATIONS</span>
                </div>
              </div>
            </div>

            {/* Fishing alert type legend */}
            <div className="flex gap-3 mb-4 flex-wrap">
              {[
                { label: 'MPA Breach', color: 'bg-error', count: fishingAlerts.filter(a => a.type.includes('MPA')).length },
                { label: 'Trawling', color: 'bg-[#ff6b35]', count: fishingAlerts.filter(a => a.type.includes('Trawl')).length },
                { label: 'AIS Manipulation', color: 'bg-[#ffb339]', count: fishingAlerts.filter(a => a.type.includes('AIS')).length },
                { label: 'Fleet Rendezvous', color: 'bg-[#8b5cf6]', count: fishingAlerts.filter(a => a.type.includes('Fleet')).length },
                { label: 'Speed Violation', color: 'bg-[#06b6d4]', count: fishingAlerts.filter(a => a.type.includes('Speed')).length },
              ].map(badge => (
                <div key={badge.label} className="flex items-center gap-2 border border-outline-variant px-2 py-1">
                  <span className={`w-2 h-2 ${badge.color}`} />
                  <span className="text-[10px] text-on-surface-variant uppercase">{badge.label}</span>
                  <span className="text-[10px] font-bold text-on-surface">{badge.count}</span>
                </div>
              ))}
            </div>

            {/* Fishing alerts table */}
            <div className="overflow-auto max-h-[200px] custom-scrollbar">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-surface-container-highest">
                  <tr className="text-[10px] text-outline uppercase tracking-wider">
                    <th className="py-2 px-3 text-left">TIME</th>
                    <th className="py-2 px-3 text-left">DETECTION TYPE</th>
                    <th className="py-2 px-3 text-left">VESSEL</th>
                    <th className="py-2 px-3 text-left">ZONE</th>
                    <th className="py-2 px-3 text-left">EVIDENCE</th>
                    <th className="py-2 px-3 text-left">SEV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {fishingAlerts.length === 0 ? (
                    <tr><td colSpan={6} className="py-6 text-center text-outline text-[12px]">No fishing violations detected. Vessels entering protected zones will appear here.</td></tr>
                  ) : (
                    fishingAlerts.slice(0, 50).map((alert) => (
                      <tr key={alert.id} className={`hover:bg-surface-container transition-colors ${
                        alert.severity === 'CRITICAL' ? 'border-l-2 border-l-error bg-error/5' :
                        alert.severity === 'HIGH' ? 'border-l-2 border-l-[#ffb339]' : ''
                      }`}>
                        <td className="py-2 px-3 text-outline whitespace-nowrap">{alert.timestamp}</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold ${
                            alert.type.includes('MPA') || alert.type.includes('Trawl') ? 'bg-error/20 text-error' :
                            alert.type.includes('AIS') ? 'bg-[#ffb339]/20 text-[#ffb339]' :
                            alert.type.includes('Fleet') ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]' :
                            'bg-[#06b6d4]/20 text-[#06b6d4]'
                          }`}>
                            {alert.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-on-surface font-medium">{alert.vesselName}</td>
                        <td className="py-2 px-3 text-primary-fixed-dim text-[11px]">{alert.zone || '—'}</td>
                        <td className="py-2 px-3 text-on-surface-variant text-[11px] max-w-[260px] truncate" title={alert.detectionDetail}>
                          {alert.detectionDetail || alert.location}
                        </td>
                        <td className={`py-2 px-3 font-bold text-[10px] ${
                          alert.severity === 'CRITICAL' ? 'text-error' :
                          alert.severity === 'HIGH' ? 'text-[#ffb339]' : 'text-outline'
                        }`}>{alert.severity}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
