/**
 * Pure helpers for the Remediation Studio. No React, no network.
 *
 * Nothing here decides whether a remediation succeeded: that comes only from backend-reported status and
 * verificationStatus (see lifecycle.ts). These helpers describe the PROPOSAL (what files, what needs a human) and
 * validate what the backend sends back after an approval request.
 */

import type { RemediationAction } from '@/types';

const STATUSES: RemediationAction['status'][] = ['PENDING', 'APPROVED', 'APPLIED', 'FAILED', 'REJECTED'];
const VERIFICATIONS = ['UNVERIFIED', 'PASSED', 'FAILED'] as const;

/** Files a unified diff touches, from its `+++ b/path` headers (falling back to `--- a/path` for deletions). */
export function filesFromDiff(diff: string | undefined): string[] {
  if (!diff) return [];
  const files: string[] = [];
  const lines = diff.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith('+++ ')) continue;
    let path = line.slice(4).trim().replace(/\t.*$/, '');
    if (path === '/dev/null') {
      const prev = lines[i - 1];
      path = prev?.startsWith('--- ') ? prev.slice(4).trim().replace(/\t.*$/, '') : '';
    }
    path = path.replace(/^[ab]\//, '');
    if (path && path !== '/dev/null' && !files.includes(path)) files.push(path);
  }
  return files;
}

/** `+`/`-` line counts, excluding the `+++`/`---` file headers. */
export function diffStats(diff: string | undefined): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of (diff ?? '').split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) added += 1;
    else if (line.startsWith('-')) removed += 1;
  }
  return { added, removed };
}

/**
 * Angle-bracket placeholders (e.g. `<scoped-staging-bucket>`) on ADDED lines. They are values the patch cannot know, so a
 * person must fill them in before the change can be real. Only added lines count: a `<` in removed or context text is
 * not a request to the reader.
 */
export function placeholdersIn(diff: string | undefined): string[] {
  const found: string[] = [];
  for (const line of (diff ?? '').split('\n')) {
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    for (const match of line.matchAll(/<([A-Za-z][A-Za-z0-9 _-]{1,60})>/g)) {
      const token = `<${match[1]}>`;
      if (!found.includes(token)) found.push(token);
    }
  }
  return found;
}

export type ApprovalCheck =
  | { ok: true; action: RemediationAction }
  /** `unknown` = the backend answered 2xx but we cannot tell what it recorded. Never treat that as an approval. */
  | { ok: false; reason: 'wrong-record' | 'malformed' };

/**
 * Validate the body of a successful POST /remediations/{id}/approve before trusting it. The client already checks `id`
 * and `status` are strings; this additionally requires the SAME id we asked about and a status the contract defines, so
 * an unrelated or garbled reply can never be shown as that remediation's new state.
 */
export function checkApprovalResponse(requestedId: string, body: unknown): ApprovalCheck {
  if (typeof body !== 'object' || body === null) return { ok: false, reason: 'malformed' };
  const r = body as Partial<RemediationAction>;
  if (typeof r.id !== 'string' || typeof r.status !== 'string') return { ok: false, reason: 'malformed' };
  if (r.id !== requestedId) return { ok: false, reason: 'wrong-record' };
  if (!STATUSES.includes(r.status)) return { ok: false, reason: 'malformed' };
  if (r.verificationStatus !== undefined && r.verificationStatus !== null && !(VERIFICATIONS as readonly string[]).includes(r.verificationStatus)) {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof r.findingId !== 'string' || typeof r.title !== 'string') return { ok: false, reason: 'malformed' };
  return { ok: true, action: r as RemediationAction };
}

/** Plain-language label for the raw backend enum, shown beside the derived stage so nothing is hidden. */
export function backendStateLabel(r: Pick<RemediationAction, 'status' | 'verificationStatus'>): string {
  return `${r.status}${r.verificationStatus ? ` / ${r.verificationStatus}` : ''}`;
}
