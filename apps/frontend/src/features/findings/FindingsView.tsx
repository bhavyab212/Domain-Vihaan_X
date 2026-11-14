import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertOctagon, Filter } from 'lucide-react';

/**
 * 3. Threat and Findings Center
 * High-density tabular triage view with provenance tags
 */
export function FindingsView() {
  // TODO (Milestone 3): Connect to apiClient.getFindings() with filters
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Threat and Findings Center</h2>
          <p className="text-xs text-slate-400">Normalized multi-domain security findings with verified provenance</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
            <Filter className="h-3 w-3 text-slate-400" /> Filter: All Categories
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identified Vulnerabilities (2)</CardTitle>
          <AlertOctagon className="h-4 w-4 text-amber-400" />
        </CardHeader>
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase">
              <tr>
                <th className="py-2">Finding</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Risk Score</th>
                <th>Provenance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="py-3 font-medium text-white">Hardcoded AWS Access Key</td>
                <td><span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">SECRET</span></td>
                <td><span className="text-rose-400 font-bold">CRITICAL</span></td>
                <td className="font-mono text-rose-400 font-bold">9.4</td>
                <td><span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400 font-medium">SIMULATED</span></td>
                <td><span className="text-amber-400 font-medium">OPEN</span></td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-white">Wildcard Action Permitted in S3 IAM Policy</td>
                <td><span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">IAC</span></td>
                <td><span className="text-amber-400 font-bold">HIGH</span></td>
                <td className="font-mono text-amber-400 font-bold">8.7</td>
                <td><span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400 font-medium">SIMULATED</span></td>
                <td><span className="text-amber-400 font-medium">OPEN</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
