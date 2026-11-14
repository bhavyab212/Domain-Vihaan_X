/**
 * Data-source boundary.
 *
 * Every view reads through this interface and never imports fixtures or the API client directly.
 * Switching between local preview data and the live backend therefore needs no page rewrites.
 */

import {
  getAssets,
  getAttackPaths,
  getFindings,
  getRemediations,
  getSecurityGraph,
} from '@/lib/api/client';
import type { DataSourceMode } from '@/lib/config/env';
import {
  PREVIEW_ASSETS,
  PREVIEW_ATTACK_PATHS,
  PREVIEW_EVIDENCE,
  PREVIEW_FINDINGS,
  PREVIEW_GRAPH,
  PREVIEW_REMEDIATIONS,
} from '@/mocks/fixtures';
import type {
  AttackPath,
  DataOrigin,
  DigitalAsset,
  FindingEvidence,
  RemediationAction,
  SecurityFinding,
  SecurityGraph,
} from '@/types';

export interface DataSource {
  readonly mode: DataSourceMode;
  readonly origin: DataOrigin;
  getAssets(signal?: AbortSignal): Promise<DigitalAsset[]>;
  getFindings(signal?: AbortSignal): Promise<SecurityFinding[]>;
  getSecurityGraph(signal?: AbortSignal): Promise<SecurityGraph>;
  getAttackPaths(signal?: AbortSignal): Promise<AttackPath[]>;
  getRemediations(signal?: AbortSignal): Promise<RemediationAction[]>;
  /** Synchronous and optional: the API contract has no evidence endpoint, so only previews supply it. */
  evidenceFor(findingId: string): FindingEvidence | null;
}

/** Live backend. Every failure propagates as an ApiError and is rendered by the view. */
export const apiDataSource: DataSource = {
  mode: 'api',
  origin: 'BACKEND_API',
  getAssets: (signal) => getAssets(signal),
  getFindings: (signal) => getFindings({}, signal),
  getSecurityGraph: (signal) => getSecurityGraph(signal),
  getAttackPaths: (signal) => getAttackPaths(signal),
  getRemediations: (signal) => getRemediations(signal),
  evidenceFor: () => null,
};

/** Local SIMULATED_DEMO fixtures. Never a confirmed scan. */
export const previewDataSource: DataSource = {
  mode: 'preview',
  origin: 'SIMULATED_DEMO',
  getAssets: async () => structuredClone(PREVIEW_ASSETS),
  getFindings: async () => structuredClone(PREVIEW_FINDINGS),
  getSecurityGraph: async () => structuredClone(PREVIEW_GRAPH),
  getAttackPaths: async () => structuredClone(PREVIEW_ATTACK_PATHS),
  getRemediations: async () => structuredClone(PREVIEW_REMEDIATIONS),
  evidenceFor: (findingId) => PREVIEW_EVIDENCE[findingId] ?? null,
};

export function getDataSource(mode: DataSourceMode): DataSource {
  return mode === 'api' ? apiDataSource : previewDataSource;
}
