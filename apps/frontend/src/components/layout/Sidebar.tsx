import React from 'react';
import { NavRoute } from '@/app/router';
import { LayoutDashboard, Network, AlertOctagon, CheckCircle2, Server, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SidebarProps {
  activeRoute: NavRoute;
  onSelectRoute: (route: NavRoute) => void;
}

export function Sidebar({ activeRoute, onSelectRoute }: SidebarProps) {
  const navItems = [
    { id: 'overview' as NavRoute, label: 'Command Center', icon: LayoutDashboard },
    { id: 'graph' as NavRoute, label: 'Security Graph', icon: Network, highlight: true },
    { id: 'findings' as NavRoute, label: 'Threats & Findings', icon: AlertOctagon },
    { id: 'assets' as NavRoute, label: 'Asset Inventory', icon: Server },
    { id: 'remediation' as NavRoute, label: 'Remediation Studio', icon: CheckCircle2 },
  ];

  return (
    <aside className="flex w-64 flex-col border-r border-slate-800 bg-slate-900/80 p-4">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600 font-bold text-white shadow-md">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white">Domain-Vihaan_X</h1>
          <p className="text-[10px] text-slate-400">Security Intelligence</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectRoute(item.id)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-rose-600/10 text-rose-400 border border-rose-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-rose-400' : 'text-slate-400')} />
              <span>{item.label}</span>
              {item.highlight && (
                <span className="ml-auto rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-rose-300">
                  CORE
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-800/80 pt-4 text-[11px] text-slate-500">
        <p>VIHAAN X Hackathon MVP</p>
        <p className="text-[10px] text-slate-600">v0.1.0-alpha</p>
      </div>
    </aside>
  );
}
