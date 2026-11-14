import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { OverviewView } from '@/features/overview/OverviewView';
import { AssetsView } from '@/features/assets/AssetsView';
import { FindingsView } from '@/features/findings/FindingsView';
import { AttackPathsView } from '@/features/attack-paths/AttackPathsView';
import { RemediationView } from '@/features/remediation/RemediationView';

export type NavRoute = 'overview' | 'assets' | 'findings' | 'graph' | 'remediation';

/**
 * Lightweight Route Dispatcher for the Five Primary Interfaces
 * TODO: Integrate React Router or hash routing during implementation phase
 */
export function Router() {
  const [activeRoute, setActiveRoute] = useState<NavRoute>('overview');

  const renderView = () => {
    switch (activeRoute) {
      case 'overview':
        return <OverviewView onNavigate={setActiveRoute} />;
      case 'assets':
        return <AssetsView />;
      case 'findings':
        return <FindingsView />;
      case 'graph':
        return <AttackPathsView />;
      case 'remediation':
        return <RemediationView />;
      default:
        return <OverviewView onNavigate={setActiveRoute} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar activeRoute={activeRoute} onSelectRoute={setActiveRoute} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar activeRoute={activeRoute} onSelectRoute={setActiveRoute} />
        <main className="flex-1 overflow-y-auto p-6">{renderView()}</main>
      </div>
    </div>
  );
}
