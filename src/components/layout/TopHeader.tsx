import React, { useState, useEffect, useRef } from 'react';
import { useEngineStore } from '../../store/useEngineStore';

export const TopHeader: React.FC = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const stats = useEngineStore((state) => state.stats);
  
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
          <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed-dim glow-active"></span>
          <span>Engine: Normal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed-dim glow-active"></span>
          <span>WebSocket: Connected</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-primary-fixed-dim font-bold">{stats.msgPerSec.toLocaleString()}</span>
          <span>Msg/Sec</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-outline">Latency:</span>
          <span className="text-primary-fixed-dim">{stats.latency}ms</span>
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
              <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full pulse-critical"></span>
            </button>
            
            {showNotifications && (
              <div className="absolute top-[36px] right-0 w-[340px] bg-surface-container-low border border-outline-variant shadow-[-8px_0_24px_rgba(0,0,0,0.5)] z-50 flex flex-col font-data-tabular text-data-tabular">
                <div className="p-3 border-b border-outline-variant bg-surface-container-highest flex justify-between items-center">
                  <span className="font-label-caps text-label-caps text-on-surface">INCIDENT ALERTS (3)</span>
                  <button className="text-primary-fixed-dim hover:underline text-[10px]">CLEAR ALL</button>
                </div>
                <div className="flex flex-col max-h-[300px] overflow-y-auto custom-scrollbar">
                  <div className="p-3 border-b border-outline-variant/50 hover:bg-surface-container transition-colors cursor-pointer border-l-2 border-l-error bg-error/5">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-error font-bold">RESTRICTED ZONE BREACH</span>
                      <span className="text-outline text-[10px]">NOW</span>
                    </div>
                    <span className="text-on-surface-variant text-[12px]">DARK FLEET TGT 01 entered HAZMAT-99X exclusion zone.</span>
                  </div>
                  <div className="p-3 border-b border-outline-variant/50 hover:bg-surface-container transition-colors cursor-pointer border-l-2 border-l-primary-fixed-dim">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-primary-fixed-dim font-bold">SPEED VIOLATION</span>
                      <span className="text-outline text-[10px]">2m ago</span>
                    </div>
                    <span className="text-on-surface-variant text-[12px]">MT PACIFIC EXP exceeding 18kts in Coastal Sector.</span>
                  </div>
                  <div className="p-3 hover:bg-surface-container transition-colors cursor-pointer border-l-2 border-l-outline-variant">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-on-surface font-bold">AIS SIGNAL LOST</span>
                      <span className="text-outline text-[10px]">15m ago</span>
                    </div>
                    <span className="text-on-surface-variant text-[12px]">Vessel UNKNOWN lost transponder signal near border.</span>
                  </div>
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
                  <button className="flex items-center justify-between p-2 hover:bg-surface-container text-left text-on-surface transition-colors" onClick={() => {
                    document.documentElement.requestFullscreen().catch(()=>alert('Fullscreen denied'));
                    setShowSettings(false);
                  }}>
                    <span>Toggle Fullscreen</span>
                    <span className="material-symbols-outlined text-[16px] text-outline">fullscreen</span>
                  </button>
                  <button className="flex items-center justify-between p-2 hover:bg-surface-container text-left text-on-surface transition-colors" onClick={(e) => {
                    e.preventDefault();
                    try {
                      const csvContent = "MMSI,VESSEL,LAT,LNG,SPEED\n235086000,MT PACIFIC EXP,12.9200,74.7800,18.2\n413840291,ZHE HAI 515,12.9100,74.7900,12.5";
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.setAttribute("href", url);
                      link.setAttribute("download", "vessel_logs.csv");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    } catch(err) {
                      alert("Download failed: " + err);
                    }
                    setShowSettings(false);
                  }}>
                    <span>Export Logs (CSV)</span>
                    <span className="material-symbols-outlined text-[16px] text-outline">download</span>
                  </button>
                  <button className="flex items-center justify-between p-2 hover:bg-surface-container text-left text-error transition-colors" onClick={() => {
                    if (window.confirm('WARNING: Flushing engine state will clear all active tracks. Continue?')) {
                      alert('Engine state flushed.');
                    }
                    setShowSettings(false);
                  }}>
                    <span>Flush Engine State</span>
                    <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="h-6 w-px bg-outline-variant"></div>
        <div className="flex flex-col items-end justify-center font-data-tabular">
          <span className="text-[12px] text-primary-fixed-dim font-bold tracking-wider">UTC 14:22:05</span>
          <span className="text-[9px] text-outline">LOCAL 09:22:05</span>
        </div>
      </div>
    </header>
  );
};
