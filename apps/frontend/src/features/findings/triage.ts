/**
 * Pure triage logic for the Threats & Findings table (filtering, sorting, counts). No React, no DOM, no network.
 *
 * Sorting and filtering only reorder or hide records the API returned. Nothing here scores, re-prioritises
 * or invents data.
 */

import { isSimulatedProvenance, type DigitalAsset, type SecurityFinding, type SeverityLevel } from '@/types';
import { parseApiDate } from '@/lib/utils/format';
import { SEVERITY_ORDER } from '@/lib/utils/severity';
import { categoryIdOf, type FindingCategory } from './categories';

export type SortKey = 'severity' | 'title' | 'scanner' | 'discovered';
export type SortDir = 'asc' | 'desc';
export interface Sort {
  key: SortKey;
  dir: SortDir;
}

/** Provenance filter groups: SIMULATED_DEMO and the legacy SIMULATED are one group ("simulated"). */
export type ProvenanceGroup = 'SIMULATED' | 'OBSERVED' | 'INFERRED';

export interface TriageFilters {
  query: string;
  severity: SeverityLevel | 'ALL';
  scanner: string; // 'ALL' or a scanner name
  category: FindingCategory | 'ALL';
  asset: string; // 'ALL' or an asset id
  status: SecurityFinding['status'] | 'ALL';
  provenance: ProvenanceGroup | 'ALL';
}

export const DEFAULT_FILTERS: TriageFilters = {
  query: '',
  severity: 'ALL',
  scanner: 'ALL',
  category: 'ALL',
  asset: 'ALL',
  status: 'ALL',
  provenance: 'ALL',
};

/** Most severe first, then newest first. */
export const DEFAULT_SORT: Sort = { key: 'severity', dir: 'desc' };

export function provenanceGroupOf(finding: Pick<SecurityFinding, 'provenance'>): ProvenanceGroup {
  if (isSimulatedProvenance(finding.provenance)) return 'SIMULATED';
  return finding.provenance === 'OBSERVED' ? 'OBSERVED' : 'INFERRED';
}

/** Higher = more severe. Unknown values sort as least severe rather than throwing. */
export function severityWeight(severity: SeverityLevel): number {
  const index = SEVERITY_ORDER.indexOf(severity);
  return index === -1 ? 0 : SEVERITY_ORDER.length - index;
}

type AssetIndex = Record<string, DigitalAsset>;

export type FilterKey = keyof TriageFilters;

/** Active (non-default) filters, for the clear-all affordance and the "n filters" label. */
export function activeFilterKeys(filters: TriageFilters): FilterKey[] {
  return (Object.keys(DEFAULT_FILTERS) as FilterKey[]).filter((key) =>
    key === 'query' ? filters.query.trim() !== '' : filters[key] !== DEFAULT_FILTERS[key],
  );
}

/**
 * Filters the findings. `ignore` skips one dimension, which lets the category tabs show counts that reflect every
 * OTHER active filter (so the tab number always matches what clicking it would show).
 */
export function applyFilters(
  findings: SecurityFinding[],
  filters: TriageFilters,
  assets: AssetIndex,
  ignore?: FilterKey,
): SecurityFinding[] {
  const q = filters.query.trim().toLowerCase();
  return findings.filter((f) => {
    if (ignore !== 'severity' && filters.severity !== 'ALL' && f.severity !== filters.severity) return false;
    if (ignore !== 'scanner' && filters.scanner !== 'ALL' && f.scanner !== filters.scanner) return false;
    if (ignore !== 'category' && filters.category !== 'ALL' && categoryIdOf(f.scanner) !== filters.category) return false;
    if (ignore !== 'asset' && filters.asset !== 'ALL' && f.assetId !== filters.asset) return false;
    if (ignore !== 'status' && filters.status !== 'ALL' && f.status !== filters.status) return false;
    if (ignore !== 'provenance' && filters.provenance !== 'ALL' && provenanceGroupOf(f) !== filters.provenance) return false;
    if (ignore !== 'query' && q) {
      const haystack = [f.title, f.description, f.scanner, f.id, assets[f.assetId]?.name ?? '', f.location?.file ?? '', f.location?.resource ?? '']
        .join('\n')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function compare(a: SecurityFinding, b: SecurityFinding, key: SortKey): number {
  switch (key) {
    case 'severity':
      return severityWeight(a.severity) - severityWeight(b.severity);
    case 'title':
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    case 'scanner':
      return a.scanner.localeCompare(b.scanner, undefined, { sensitivity: 'base' });
    case 'discovered':
      return (parseApiDate(a.discoveredAt)?.getTime() ?? 0) - (parseApiDate(b.discoveredAt)?.getTime() ?? 0);
  }
}

/** Stable sort. Ties break on newest-first then id, so the order never depends on input order. */
export function sortFindings(findings: SecurityFinding[], sort: Sort): SecurityFinding[] {
  const sign = sort.dir === 'asc' ? 1 : -1;
  return [...findings].sort(
    (a, b) =>
      sign * compare(a, b, sort.key) ||
      (sort.key === 'discovered' ? 0 : compare(b, a, 'discovered')) ||
      a.id.localeCompare(b.id),
  );
}

/** Counts per category among findings matching every other filter. */
export function categoryCounts(
  findings: SecurityFinding[],
  filters: TriageFilters,
  assets: AssetIndex,
): Record<FindingCategory, number> {
  const counts: Record<FindingCategory, number> = { SECRET: 0, IAC: 0, VULNERABILITY: 0, EXTERNAL: 0, OTHER: 0 };
  for (const f of applyFilters(findings, filters, assets, 'category')) counts[categoryIdOf(f.scanner)] += 1;
  return counts;
}

/** The next sort when a column header is activated: same column flips direction, new column uses its natural default. */
export function nextSort(current: Sort, key: SortKey): Sort {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  // severity and discovery are most useful newest/most-severe first; text columns A to Z
  return { key, dir: key === 'severity' || key === 'discovered' ? 'desc' : 'asc' };
}
