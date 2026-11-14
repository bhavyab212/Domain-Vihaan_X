import React from 'react';
import { NavRoute } from '@/app/router';
import { Button } from '@/components/ui/button';
import { RefreshCw, Shield, AlertTriangle } from 'lucide-react';

interface NavbarProps {
  activeRoute: NavRoute;
  onSelectRoute: (route: NavRoute) => void;
}

export function Navbar({}: NavbarProps) {
  const handleResetDemo = async () => {
    // TODO: Wire to apiClient.resetDemo() during implementation
    console.log('[Navbar] One-click demo scenario reset triggered');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/40 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          DEMO MODE (SYNTHETIC SAAS)
        </span>
        <span className="text-xs text-slate-400">AcmeCloud Test Workspace</span>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={handleResetDemo}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Reset Demo State
        </Button>
        <div className="flex items-center gap-2 border-l border-slate-800 pl-4 text-xs text-slate-400">
          <Shield className="h-4 w-4 text-emerald-400" />
          <span>System Healthy</span>
        </div>
      </div>
    </header>
  );
}
