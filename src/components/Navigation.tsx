/**
 * NONONICK AUTOMATION ENGINE
 * Responsive Navigation Bar (Desktop Tabs + Mobile Glass Bottom Bar)
 */

import React from 'react';
import { 
  LayoutDashboard, 
  GitFork, 
  PlaySquare, 
  Webhook, 
  Link2, 
  FileText, 
  Settings2 
} from 'lucide-react';

export type NavTab = 
  | 'dashboard'
  | 'automations'
  | 'runs'
  | 'webhooks'
  | 'connections'
  | 'audit'
  | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  runsBadge?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  runsBadge
}) => {
  const tabs = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'automations' as NavTab, label: 'Automations', icon: GitFork },
    { id: 'runs' as NavTab, label: 'Runs', icon: PlaySquare, badge: runsBadge },
    { id: 'webhooks' as NavTab, label: 'Webhooks', icon: Webhook },
    { id: 'connections' as NavTab, label: 'Connections', icon: Link2 },
    { id: 'audit' as NavTab, label: 'Audit Logs', icon: FileText },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings2 }
  ];

  return (
    <>
      {/* Desktop / Tablet Top Tab Navigation */}
      <nav className="hidden md:block bg-[#0a0e17] border-b border-white/[0.06] px-4">
        <div className="max-w-7xl mx-auto flex items-center space-x-1 overflow-x-auto py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Bottom Glass Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#07090e]/95 backdrop-blur-xl border-t border-white/[0.08] px-2 py-2">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {tabs.slice(0, 5).map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[54px] min-h-[44px] ${
                  isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : ''}`} />
                <span className="text-[10px] font-medium tracking-tight mt-1">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 w-6 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" />
                )}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]"></span>
                )}
              </button>
            );
          })}

          {/* More trigger for Mobile */}
          <button
            onClick={() => onSelectTab(currentTab === 'settings' ? 'audit' : 'settings')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[50px] min-h-[44px] ${
              currentTab === 'audit' || currentTab === 'settings' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings2 className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight mt-1">More</span>
            {(currentTab === 'audit' || currentTab === 'settings') && (
              <span className="absolute bottom-0 w-6 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
