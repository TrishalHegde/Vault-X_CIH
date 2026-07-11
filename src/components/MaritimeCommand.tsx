import React from 'react';
import { useEngineStore } from '../store/useEngineStore';
import { TopHeader } from './layout/TopHeader';
import { Sidebar } from './layout/Sidebar';
import { BottomWorkspace } from './layout/BottomWorkspace';
import { MapCanvas } from './layout/MapCanvas';
import { VesselDrawer } from './layout/VesselDrawer';

export const MaritimeCommand: React.FC = () => {
  const stats = useEngineStore((state) => state.stats);

  return (
    <div className="bg-background text-on-surface min-h-screen overflow-hidden antialiased selection:bg-primary-fixed-dim selection:text-on-primary">
      <TopHeader />
      
      <Sidebar />

      {/* Main Content Area */}
      <main className="absolute top-[48px] bottom-[48px] left-[320px] right-0 flex flex-col bg-surface-container-lowest overflow-hidden">
        
        <MapCanvas />

        <VesselDrawer />

        <BottomWorkspace />
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full z-50 h-[48px] flex items-center px-margin-edge justify-between border-t border-outline-variant bg-background dark:bg-background">
        <div className="font-data-tabular text-data-tabular text-on-surface-variant flex gap-4">
          <span>TOTAL TRACKED: {stats.totalTracked.toLocaleString()}</span>
          <span className="text-outline-variant">|</span>
          <span>MSG PROCESSED: {(stats.msgProcessed / 1000000000).toFixed(1)}B</span>
          <span className="text-outline-variant">|</span>
          <span className="text-error">ACTIVE THREATS: {stats.activeThreats}</span>
          <span className="text-outline-variant">|</span>
          <span className="text-primary-fixed-dim glow-active">ENGINE UPTIME: {stats.uptime}</span>
        </div>
        <div className="flex items-center gap-6">
          <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary-fixed-dim transition-colors cursor-default uppercase" href="#">System Health</a>
          <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary-fixed-dim transition-colors cursor-default uppercase" href="#">Network Diagnostics</a>
          <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary-fixed-dim transition-colors cursor-default uppercase" href="#">Node Status</a>
        </div>
      </footer>
    </div>
  );
};
