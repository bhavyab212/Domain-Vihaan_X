import type { RemediationAction } from '@/types';

/**
 * Remediation lifecycle derived ONLY from fields the backend reports (status, verificationStatus).
 *
 * Honesty rules (AGENTS.md rules 14-15, ADR-007):
 *  - "applied" requires status === 'APPLIED'.
 *  - "verified" requires status === 'APPLIED' AND verificationStatus === 'PASSED'.
 *  - Opening, previewing or approving in the UI never moves a stage forward by itself.
 */
export type StageState = 'done' | 'current' | 'pending' | 'failed' | 'skipped';

export interface Stage {
  id: 'proposed' | 'approved' | 'applied' | 'verified';
  label: string;
  state: StageState;
  detail: string;
}

export type Outcome = 'awaiting-approval' | 'approved' | 'applied-unverified' | 'verified' | 'verification-failed' | 'failed' | 'rejected';

export function outcomeOf(r: RemediationAction): Outcome {
  switch (r.status) {
    case 'PENDING':
      return 'awaiting-approval';
    case 'APPROVED':
      return 'approved';
    case 'APPLIED':
      if (r.verificationStatus === 'PASSED') return 'verified';
      if (r.verificationStatus === 'FAILED') return 'verification-failed';
      return 'applied-unverified';
    case 'FAILED':
      return 'failed';
    case 'REJECTED':
      return 'rejected';
  }
}

/** True only for a backend-reported, verified, successful remediation. */
export function isVerifiedSuccess(r: RemediationAction): boolean {
  return outcomeOf(r) === 'verified';
}

export function stagesOf(r: RemediationAction): Stage[] {
  const o = outcomeOf(r);
  const proposed: Stage = { id: 'proposed', label: 'Proposed', state: 'done', detail: 'A patch is available for review.' };

  switch (o) {
    case 'awaiting-approval':
      return [
        proposed,
        { id: 'approved', label: 'Human approval', state: 'current', detail: 'Waiting for a person to review and approve.' },
        { id: 'applied', label: 'Applied', state: 'pending', detail: 'Nothing has been changed.' },
        { id: 'verified', label: 'Verified', state: 'pending', detail: 'Verification runs after the fix is applied.' },
      ];
    case 'approved':
      return [
        proposed,
        { id: 'approved', label: 'Human approval', state: 'done', detail: 'Approval recorded by the backend.' },
        { id: 'applied', label: 'Applied', state: 'current', detail: 'Approved, but the backend has not reported it as applied.' },
        { id: 'verified', label: 'Verified', state: 'pending', detail: 'Not verified.' },
      ];
    case 'applied-unverified':
      return [
        proposed,
        { id: 'approved', label: 'Human approval', state: 'done', detail: 'Approval recorded by the backend.' },
        { id: 'applied', label: 'Applied', state: 'done', detail: 'The backend reports the change as applied.' },
        { id: 'verified', label: 'Verified', state: 'current', detail: 'Not verified yet. Applying a change does not prove the risk is gone.' },
      ];
    case 'verified':
      return [
        proposed,
        { id: 'approved', label: 'Human approval', state: 'done', detail: 'Approval recorded by the backend.' },
        { id: 'applied', label: 'Applied', state: 'done', detail: 'The backend reports the change as applied.' },
        { id: 'verified', label: 'Verified', state: 'done', detail: 'Re-assessment passed, as reported by the backend.' },
      ];
    case 'verification-failed':
      return [
        proposed,
        { id: 'approved', label: 'Human approval', state: 'done', detail: 'Approval recorded by the backend.' },
        { id: 'applied', label: 'Applied', state: 'done', detail: 'The backend reports the change as applied.' },
        { id: 'verified', label: 'Verified', state: 'failed', detail: 'Re-assessment did not pass. The risk may remain.' },
      ];
    case 'failed':
      return [
        proposed,
        { id: 'approved', label: 'Human approval', state: 'done', detail: 'Approval recorded by the backend.' },
        { id: 'applied', label: 'Applied', state: 'failed', detail: 'The backend reports that applying the change failed.' },
        { id: 'verified', label: 'Verified', state: 'skipped', detail: 'Not run.' },
      ];
    case 'rejected':
      return [
        proposed,
        { id: 'approved', label: 'Human approval', state: 'failed', detail: 'The remediation was rejected.' },
        { id: 'applied', label: 'Applied', state: 'skipped', detail: 'Nothing was changed.' },
        { id: 'verified', label: 'Verified', state: 'skipped', detail: 'Not run.' },
      ];
  }
}
