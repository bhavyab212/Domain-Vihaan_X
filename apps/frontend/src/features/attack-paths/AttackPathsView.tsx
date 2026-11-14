import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Network, Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 4. Business Security Graph & Attack Path Investigation
 * Signature visual feature for the VIHAAN X live presentation
 */
export function AttackPathsView() {
  // TODO (Milestone 2): Integrate React Flow (@xyflow/react) interactive canvas & custom nodes
  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Business Security Graph</h2>
          <p className="text-xs text-slate-400">Topological asset relationships and cross-domain attack paths</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400">
            <AlertTriangle className="h-3 w-3" /> 1 Active Kill Chain Detected
          </span>
        </div>
      </div>

      <div className="relative flex-1 rounded-lg border border-slate-800 bg-slate-950/80 p-4">
        {/* Placeholder canvas simulating the React Flow workspace */}
        <div className="flex h-full flex-col items-center justify-center space-y-4 rounded-md border border-dashed border-slate-800 text-center">
          <div className="rounded-full bg-rose-500/10 p-4 border border-rose-500/20">
            <Network className="h-8 w-8 text-rose-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">React Flow Canvas Scaffolding</h3>
            <p className="max-w-md text-xs text-slate-400 mt-1">
              Interactive node-and-edge visualization rendering the 4-node attack chain will be wired here in Milestone 2.
            </p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-900/60 p-3 text-left font-mono text-[11px] text-slate-300">
            <span className="text-rose-400 font-bold">ATTACK PATH:</span> repo-api ➔ Leaked Key ➔ StagingDeployerRole ➔ S3 Backups
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            AI Kill-Chain Investigation Drawer
          </CardTitle>
        </CardHeader>
        <p className="text-xs text-slate-300 leading-relaxed">
          A developer committed staging AWS credentials into repository <code className="text-rose-400">acme-backend-api</code>. The associated IAM role possesses wildcard S3 permissions, granting full read access to production customer database backup bucket <code className="text-rose-400">s3://acme-prod-db-backups</code>.
        </p>
      </Card>
    </div>
  );
}
