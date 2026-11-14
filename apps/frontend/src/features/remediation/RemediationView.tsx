import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ShieldCheck, FileCode } from 'lucide-react';

/**
 * 5. AI Remediation Center Studio
 * Supervised human-in-the-loop remediation and automated verification rescan
 */
export function RemediationView() {
  // TODO (Milestone 4): Connect to apiClient.approveRemediation() and executeRemediation()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">AI Remediation Center Studio</h2>
          <p className="text-xs text-slate-400">Actionable configuration patches with mandatory human approval</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
            Pending Approval
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-rose-400" />
            Recommended Patch: Scope IAM Policy to Staging S3 Bucket Only
          </CardTitle>
          <span className="text-[11px] font-mono text-slate-400">test_env/mock_saas/iac/iam_staging.tf</span>
        </CardHeader>

        <div className="my-3 rounded border border-slate-800 bg-slate-950 p-4 font-mono text-xs">
          <p className="text-slate-500 text-[11px]">@@ -6,3 +6,3 @@</p>
          <p className="text-red-400 bg-red-950/30 px-1">- Resource = "*"</p>
          <p className="text-emerald-400 bg-emerald-950/30 px-1">+ Resource = "arn:aws:s3:::acme-staging-assets/*"</p>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-400">
            Applying this patch will restrict the staging IAM role and trigger an automated verification re-scan.
          </p>
          <Button variant="primary" size="sm">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Approve & Execute Fix
          </Button>
        </div>
      </Card>
    </div>
  );
}
