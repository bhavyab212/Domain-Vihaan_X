import { describe, expect, it } from 'vitest';
import { PREVIEW_REMEDIATIONS } from '@/mocks/fixtures';
import { backendStateLabel, checkApprovalResponse, diffStats, filesFromDiff, placeholdersIn } from './remediationModel';

const good = { ...PREVIEW_REMEDIATIONS[0], status: 'APPROVED' as const };

describe('filesFromDiff', () => {
  it('reads the +++ headers and strips the a/ b/ prefix', () => {
    expect(filesFromDiff(PREVIEW_REMEDIATIONS[0].patchDiff)).toEqual(['config/staging.env']);
    expect(filesFromDiff(PREVIEW_REMEDIATIONS[1].patchDiff)).toEqual(['iac/iam_staging.tf']);
  });

  it('lists several files once each, in order', () => {
    const diff = '--- a/x.tf\n+++ b/x.tf\n@@ -1 +1 @@\n-a\n+b\n--- a/y.env\n+++ b/y.env\n@@ -1 +1 @@\n-c\n+d\n--- a/x.tf\n+++ b/x.tf\n';
    expect(filesFromDiff(diff)).toEqual(['x.tf', 'y.env']);
  });

  it('names a deleted file from its --- header', () => {
    expect(filesFromDiff('--- a/old/secret.env\n+++ /dev/null\n@@ -1 +0,0 @@\n-x\n')).toEqual(['old/secret.env']);
  });

  it('ignores a timestamp tab suffix and returns nothing for empty or header-less text', () => {
    expect(filesFromDiff('--- a/f\t2026-01-01\n+++ b/f\t2026-01-01\n')).toEqual(['f']);
    expect(filesFromDiff(undefined)).toEqual([]);
    expect(filesFromDiff('')).toEqual([]);
    expect(filesFromDiff('just some text\n+not a header')).toEqual([]);
  });
});

describe('diffStats', () => {
  it('counts added and removed lines, not the file headers', () => {
    expect(diffStats(PREVIEW_REMEDIATIONS[0].patchDiff)).toEqual({ added: 1, removed: 1 });
    expect(diffStats(PREVIEW_REMEDIATIONS[1].patchDiff)).toEqual({ added: 2, removed: 2 });
    expect(diffStats(undefined)).toEqual({ added: 0, removed: 0 });
  });
});

describe('placeholdersIn', () => {
  it('finds the placeholder a human must complete, on added lines only', () => {
    expect(placeholdersIn(PREVIEW_REMEDIATIONS[1].patchDiff)).toEqual(['<scoped-staging-bucket>']);
  });

  it('ignores angle brackets in removed or context lines and in headers', () => {
    expect(placeholdersIn('--- a/<not-this>\n+++ b/<nor-this>\n-old <removed-one>\n ctx <context-one>\n+new <real-one>\n+again <real-one>')).toEqual(['<real-one>']);
  });

  it('finds none when the patch is complete, or when there is no patch', () => {
    expect(placeholdersIn(PREVIEW_REMEDIATIONS[0].patchDiff)).toEqual([]);
    expect(placeholdersIn(undefined)).toEqual([]);
  });
});

describe('checkApprovalResponse refuses to trust a reply it cannot verify', () => {
  it('accepts a well-formed reply about the SAME remediation', () => {
    const check = checkApprovalResponse('rem-01', good);
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.action.status).toBe('APPROVED');
  });

  it('rejects a reply about a different remediation', () => {
    expect(checkApprovalResponse('rem-02', good)).toEqual({ ok: false, reason: 'wrong-record' });
  });

  it.each<[string, unknown]>([
    ['null', null],
    ['a string', 'ok'],
    ['an array', []],
    ['no id', { status: 'APPROVED' }],
    ['no status', { id: 'rem-01' }],
    ['an unknown status', { ...good, status: 'DONE' }],
    ['a numeric status', { ...good, status: 1 }],
    ['an unknown verificationStatus', { ...good, verificationStatus: 'GREAT' }],
    ['no findingId', { ...good, findingId: undefined }],
    ['no title', { ...good, title: undefined }],
  ])('rejects %s as malformed', (_name, body) => {
    expect(checkApprovalResponse('rem-01', body)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('accepts every status the contract defines and a missing or null verificationStatus', () => {
    for (const status of ['PENDING', 'APPROVED', 'APPLIED', 'FAILED', 'REJECTED'] as const) {
      expect(checkApprovalResponse('rem-01', { ...good, status }).ok).toBe(true);
    }
    expect(checkApprovalResponse('rem-01', { ...good, verificationStatus: undefined }).ok).toBe(true);
    expect(checkApprovalResponse('rem-01', { ...good, verificationStatus: null }).ok).toBe(true);
  });
});

describe('backendStateLabel', () => {
  it('shows the raw backend enums exactly', () => {
    expect(backendStateLabel({ status: 'APPLIED', verificationStatus: 'PASSED' })).toBe('APPLIED / PASSED');
    expect(backendStateLabel({ status: 'PENDING' })).toBe('PENDING');
  });
});
