/**
 * NONONICK AUTOMATION ENGINE
 * Header Component with Live System Pulse
 */

import React from 'react';
import { Cpu, Zap, Activity, Radio, Plus } from 'lucide-react';
import { DashboardMetrics } from '../types/index.js';

interface HeaderProps {
  metrics: DashboardMetrics | null;
  isConnected: boolean;
  onNewWorkflow: () => void;
}

export const Header: React.FC<HeaderProps> = ({ metrics, isConnected, onNewWorkflow }) => {
  return (
    <header className="sticky top-0 z-40 bg-[#07090e]/90 backdrop-blur-md border-b border-white/[0.08] px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-blue-600/30 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-cyan-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-cyan-500' : 'bg-amber-500'}`}></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-wider bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                NONONICK
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                ENGINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Deterministic Automation Architecture</p>
          </div>
        </div>

        {/* Live Metrics & Quick Action */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Engine Real-time status */}
          <div className="hidden md:flex items-center gap-3 text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="font-mono text-[11px]">
                {metrics ? `${metrics.runningJobs} Active` : '0 Active'}
              </span>
            </div>
            <div className="w-px h-3 bg-slate-700"></div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono text-[11px]">
                {metrics ? `${metrics.queuedJobs} Queued` : '0 Queued'}
              </span>
            </div>
          </div>

          <button
            onClick={onNewWorkflow}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs sm:text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create</span>
          </button>
        </div>

      </div>
    </header>
  );
};
