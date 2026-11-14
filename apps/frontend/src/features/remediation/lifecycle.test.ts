import { describe, expect, it } from 'vitest';
import type { RemediationAction } from '@/types';
import { isVerifiedSuccess, outcomeOf, stagesOf } from './lifecycle';

const base: RemediationAction = {
  id: 'r',
  findingId: 'f',
  title: 't',
  description: 'd',
  requiresApproval: true,
  status: 'PENDING',
  createdAt: '2026-11-14T10:12:00Z',
};
const make = (patch: Partial<RemediationAction>): RemediationAction => ({ ...base, ...patch });

describe('remediation lifecycle honesty', () => {
  it('is verified ONLY when applied AND verification passed', () => {
    const cases: [Partial<RemediationAction>, boolean][] = [
      [{ status: 'PENDING' }, false],
      [{ status: 'PENDING', verificationStatus: 'PASSED' }, false],
      [{ status: 'APPROVED', verificationStatus: 'PASSED' }, false],
      [{ status: 'APPLIED' }, false],
      [{ status: 'APPLIED', verificationStatus: 'UNVERIFIED' }, false],
      [{ status: 'APPLIED', verificationStatus: 'FAILED' }, false],
      [{ status: 'FAILED', verificationStatus: 'PASSED' }, false],
      [{ status: 'REJECTED', verificationStatus: 'PASSED' }, false],
      [{ status: 'APPLIED', verificationStatus: 'PASSED' }, true],
    ];
    for (const [patch, expected] of cases) expect(isVerifiedSuccess(make(patch))).toBe(expected);
  });

  it('does not mark applied/verified stages done for a pending or merely approved remediation', () => {
    for (const status of ['PENDING', 'APPROVED'] as const) {
      const stages = stagesOf(make({ status }));
      expect(stages.find((s) => s.id === 'applied')?.state).not.toBe('done');
      expect(stages.find((s) => s.id === 'verified')?.state).not.toBe('done');
    }
  });

  it('keeps "verified" pending-like after apply until verification passes', () => {
    const stages = stagesOf(make({ status: 'APPLIED', verificationStatus: 'UNVERIFIED' }));
    expect(stages.find((s) => s.id === 'applied')?.state).toBe('done');
    expect(stages.find((s) => s.id === 'verified')?.state).toBe('current');
    expect(outcomeOf(make({ status: 'APPLIED' }))).toBe('applied-unverified');
  });

  it('surfaces failure states explicitly', () => {
    expect(stagesOf(make({ status: 'APPLIED', verificationStatus: 'FAILED' })).find((s) => s.id === 'verified')?.state).toBe('failed');
    expect(stagesOf(make({ status: 'FAILED' })).find((s) => s.id === 'applied')?.state).toBe('failed');
    expect(stagesOf(make({ status: 'REJECTED' })).find((s) => s.id === 'approved')?.state).toBe('failed');
  });
});
