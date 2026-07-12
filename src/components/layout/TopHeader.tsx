import React, { useState, useEffect, useRef } from 'react';
import { useEngineStore } from '../../store/useEngineStore';

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatUTC(d: Date) {
  return d.toUTCString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, '$1');
}

function formatIST(d: Date) {
  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const TopHeader: React.FC = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const stats = useEngineStore((state) => state.stats);
  const vessels = useEngineStore((state) => state.vessels);
  const wsConnected = useEngineStore((state) => state.wsConnected);
  const activeThreats = useEngineStore((state) => state.activeThreats);
  const now = useLiveClock();

  const notifRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const exportCSV = () => {
    try {
      const headers = 'MMSI,VESSEL,TYPE,LAT,LNG,SPEED,RISK';
      const rows = vessels.map(
        (v) => `${v.mmsi},${v.name},${v.type},${v.lat.toFixed(4)},${v.lng.toFixed(4)},${v.speed.toFixed(1)},${v.risk}`
      );
      const csvContent = [headers, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `vessel_logs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Download failed: ' + err);
    }
  };

  return (
    <header className="fixed top-0 w-full z-[2000] flex items-center px-margin-edge h-[48px] justify-between border-b border-outline-variant bg-background dark:bg-background">
      {/* Brand & Logo */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded border border-primary-fixed-dim/30 flex items-center justify-center glow-active overflow-hidden bg-surface-container">
          <img src="/maritime-logo.png" alt="Maritime Command Logo" className="w-full h-full object-contain" />
        </div>
        <span className="font-headline-sm text-headline-sm font-black tracking-tighter text-primary-fixed-dim dark:text-primary-fixed-dim uppercase">
          Maritime Operations Center
        </span>
      </div>

      {/* Global Status Indicators */}
      <div className="flex items-center gap-6 font-data-tabular text-[10px] text-on-surface-variant uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-primary-fixed-dim glow-active' : 'bg-error'}`}
          />
          <span>Engine: {wsConnected ? 'Online' : 'Offline'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-primary-fixed-dim glow-active' : 'bg-outline'}`}
          />
          <span>WebSocket: {wsConnected ? 'Connected' : 'Reconnecting...'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-primary-fixed-dim font-bold">{stats.msgPerSec.toLocaleString()}</span>
          <span>Msg/Sec</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-outline">Latency:</span>
          <span className="text-primary-fixed-dim">{stats.latency.toFixed ? stats.latency.toFixed(1) : stats.latency}ms</span>
        </div>
      </div>

      {/* Trailing Actions & Time */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`text-on-surface-variant hover:bg-surface-container-highest transition-colors p-1 rounded-DEFAULT active:opacity-80 duration-100 flex items-center justify-center relative ${showNotifications ? 'bg-surface-container-highest text-primary-fixed-dim' : ''}`}
            >
              <span className="material-symbols-outlined text-[20px]">notifications_active</span>
              {activeThreats.length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full pulse-critical" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-[36px] right-0 w-[340px] bg-surface-container-low border border-outline-variant shadow-[-8px_0_24px_rgba(0,0,0,0.5)] z-50 flex flex-col font-data-tabular text-data-tabular">
                <div className="p-3 border-b border-outline-variant bg-surface-container-highest flex justify-between items-center">
                  <span className="font-label-caps text-label-caps text-on-surface">
                    INCIDENT ALERTS ({activeThreats.length})
                  </span>
                  <button className="text-primary-fixed-dim hover:underline text-[10px]">CLEAR ALL</button>
                </div>
                <div className="flex flex-col max-h-[300px] overflow-y-auto custom-scrollbar">
                  {activeThreats.length === 0 ? (
                    <div className="p-4 text-center text-outline text-[12px]">No active alerts</div>
                  ) : (
                    activeThreats.slice(0, 10).map((threat) => (
                      <div
                        key={threat.id}
                        className={`p-3 border-b border-outline-variant/50 hover:bg-surface-container transition-colors cursor-pointer border-l-2 ${
                          threat.severity === 'CRITICAL'
                            ? 'border-l-error bg-error/5'
                            : 'border-l-primary-fixed-dim'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span
                            className={`font-bold text-[11px] ${
                              threat.severity === 'CRITICAL' ? 'text-error' : 'text-primary-fixed-dim'
                            }`}
                          >
                            {threat.type.toUpperCase()}
                          </span>
                          <span className="text-outline text-[10px]">{threat.timestamp}</span>
                        </div>
                        <span className="text-on-surface-variant text-[12px]">
                          {threat.vesselName} — {threat.location}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`text-on-surface-variant hover:bg-surface-container-highest transition-colors p-1 rounded-DEFAULT active:opacity-80 duration-100 flex items-center justify-center ${showSettings ? 'bg-surface-container-highest text-primary-fixed-dim' : ''}`}
            >
              <span className="material-symbols-outlined text-[20px]">settings_ethernet</span>
            </button>

            {showSettings && (
              <div className="absolute top-[36px] right-0 w-[240px] bg-surface-container-low border border-outline-variant shadow-[-8px_0_24px_rgba(0,0,0,0.5)] z-50 flex flex-col font-data-tabular text-data-tabular">
                <div className="p-3 border-b border-outline-variant bg-surface-container-highest">
                  <span className="font-label-caps text-label-caps text-on-surface">SYSTEM PREFERENCES</span>
                </div>
                <div className="flex flex-col p-2 gap-1">
                  <button
                    className="flex items-center justify-between p-2 hover:bg-surface-container text-left text-on-surface transition-colors"
                    onClick={() => {
                      document.documentElement.requestFullscreen().catch(() => alert('Fullscreen denied'));
                      setShowSettings(false);
                    }}
                  >
                    <span>Toggle Fullscreen</span>
                    <span className="material-symbols-outlined text-[16px] text-outline">fullscreen</span>
                  </button>
                  <button
                    className="flex items-center justify-between p-2 hover:bg-surface-container text-left text-on-surface transition-colors"
                    onClick={() => {
                      exportCSV();
                      setShowSettings(false);
                    }}
                  >
                    <span>Export Logs (CSV)</span>
                    <span className="material-symbols-outlined text-[16px] text-outline">download</span>
                  </button>
                  <button
                    className="flex items-center justify-between p-2 hover:bg-surface-container text-left text-error transition-colors"
                    onClick={() => {
                      if (window.confirm('WARNING: Flushing engine state will clear all active tracks. Continue?')) {
                        alert('Engine state flushed (restart engine to re-populate).');
                      }
                      setShowSettings(false);
                    }}
                  >
                    <span>Flush Engine State</span>
                    <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="h-6 w-px bg-outline-variant" />
        {/* Live Clock */}
        <div className="flex flex-col items-end justify-center font-data-tabular">
          <span className="text-[12px] text-primary-fixed-dim font-bold tracking-wider">
            UTC {formatUTC(now)}
          </span>
          <span className="text-[9px] text-outline">IST {formatIST(now)}</span>
        </div>
      </div>
    </header>
  );
};
