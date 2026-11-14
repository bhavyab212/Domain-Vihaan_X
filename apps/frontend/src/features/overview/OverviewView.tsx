import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NavRoute } from '@/app/router';
import { ShieldAlert, AlertOctagon, Network, Play } from 'lucide-react';

interface OverviewViewProps {
  onNavigate: (route: NavRoute) => void;
}

/**
 * 1. Security Command Center
 * Primary executive cockpit for VIHAAN X live presentation
 */
export function OverviewView({ onNavigate }: OverviewViewProps) {
  // TODO (Milestone 2): Connect live status from useScanStatus hook
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Security Command Center</h2>
          <p className="text-xs text-slate-400">AcmeCloud Executive Posture & Active Threat Trajectories</p>
        </div>
        <Button onClick={() => onNavigate('graph')}>
          <Play className="mr-2 h-3.5 w-3.5" />
          Inspect Attack Graph
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contextual Posture Score</CardTitle>
            <ShieldAlert className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <div className="text-3xl font-extrabold text-rose-400">8.4 / 10</div>
          <p className="mt-1 text-xs text-slate-400">CRITICAL — Multi-Hop Attack Path Active</p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Attack Paths</CardTitle>
            <Network className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <div className="text-3xl font-extrabold text-white">1</div>
          <p className="mt-1 text-xs text-slate-400">Ingress to Production S3 Backups</p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identified Vulnerabilities</CardTitle>
            <AlertOctagon className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <div className="text-3xl font-extrabold text-white">2</div>
          <p className="mt-1 text-xs text-slate-400">1 Hardcoded Secret, 1 Permissive IAM</p>
        </Card>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-center">
        <p className="text-xs text-slate-500">
          [Overview Scaffolding Placeholder — Implementation in Milestone 2]
        </p>
      </div>
    </div>
  );
}
