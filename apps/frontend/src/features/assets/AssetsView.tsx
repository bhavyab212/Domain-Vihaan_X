import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 2. Asset Inventory Interface
 */
export function AssetsView() {
  // TODO (Milestone 1): Connect to apiClient.getAssets()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Registered Digital Assets</h2>
          <p className="text-xs text-slate-400">Inventory of repositories, cloud resources, and external endpoints</p>
        </div>
        <Button variant="secondary" size="sm">
          <Plus className="mr-2 h-3.5 w-3.5" />
          Register Asset
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monitored Assets (3)</CardTitle>
          <Server className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <div className="divide-y divide-slate-800 text-xs">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold text-white">acme-backend-api</p>
              <p className="text-slate-400 font-mono text-[11px]">test_env/mock_saas/repo</p>
            </div>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">REPOSITORY</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold text-white">StagingDeployerRole</p>
              <p className="text-slate-400 font-mono text-[11px]">arn:aws:iam::123456789012:role/StagingDeployer</p>
            </div>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">IAM_ROLE</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold text-white">acme-prod-db-backups</p>
              <p className="text-slate-400 font-mono text-[11px]">s3://acme-prod-db-backups</p>
            </div>
            <span className="rounded bg-rose-500/20 px-2 py-0.5 text-rose-300 font-semibold">CRITICAL STORAGE</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
