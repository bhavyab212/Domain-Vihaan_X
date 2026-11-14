/**
 * Triage state <-> URL search params, so a reload or a shared link restores the exact view.
 *
 * Parsing is defensive: anything unknown or malformed falls back to the default instead of throwing or being
 * trusted (the URL is user input). Defaults are omitted from the URL to keep links short.
 */

import { SEVERITY_ORDER } from '@/lib/utils/severity';
import type { SecurityFinding, SeverityLevel } from '@/types';
import { CATEGORY_ORDER, type FindingCategory } from './categories';
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  type ProvenanceGroup,
  type Sort,
  type SortKey,
  type TriageFilters,
} from './triage';

export interface TriageState {
  filters: TriageFilters;
  sort: Sort;
  selectedId: string | null;
}

const SORT_KEYS: SortKey[] = ['severity', 'title', 'scanner', 'discovered'];
const STATUSES: SecurityFinding['status'][] = ['OPEN', 'IN_REMEDIATION', 'RESOLVED', 'ACCEPTED_RISK'];
const PROVENANCE_GROUPS: ProvenanceGroup[] = ['SIMULATED', 'OBSERVED', 'INFERRED'];

const MAX_TEXT = 200;

function pick<T extends string>(raw: string | null, allowed: readonly T[]): T | null {
  return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

/** Free text (search, scanner, asset id, selected id) is length-capped; React escapes it on render. */
function text(raw: string | null): string {
  return (raw ?? '').slice(0, MAX_TEXT);
}

export function parseTriageState(params: URLSearchParams): TriageState {
  const sortKey = pick(params.get('sort'), SORT_KEYS) ?? DEFAULT_SORT.key;
  const sortDir = pick(params.get('dir'), ['asc', 'desc'] as const) ?? DEFAULT_SORT.dir;

  const scanner = text(params.get('scanner'));
  const asset = text(params.get('asset'));
  const selected = text(params.get('f'));

  return {
    filters: {
      query: text(params.get('q')),
      severity: pick<SeverityLevel>(params.get('severity'), SEVERITY_ORDER) ?? 'ALL',
      scanner: scanner || 'ALL',
      category: pick<FindingCategory>(params.get('category'), CATEGORY_ORDER) ?? 'ALL',
      asset: asset || 'ALL',
      status: pick(params.get('status'), STATUSES) ?? 'ALL',
      provenance: pick(params.get('provenance'), PROVENANCE_GROUPS) ?? 'ALL',
    },
    sort: { key: sortKey, dir: sortDir },
    selectedId: selected || null,
  };
}

/**
 * Builds the search string for a state. Starts from `base` so unrelated params are preserved, and removes
 * every triage key that equals its default.
 */
export function serializeTriageState(state: TriageState, base: URLSearchParams = new URLSearchParams()): URLSearchParams {
  const next = new URLSearchParams(base);
  const set = (key: string, value: string, isDefault: boolean) => {
    if (isDefault) next.delete(key);
    else next.set(key, value);
  };
  const { filters, sort, selectedId } = state;

  set('q', filters.query.trim(), filters.query.trim() === '');
  set('severity', filters.severity, filters.severity === DEFAULT_FILTERS.severity);
  set('scanner', filters.scanner, filters.scanner === DEFAULT_FILTERS.scanner);
  set('category', filters.category, filters.category === DEFAULT_FILTERS.category);
  set('asset', filters.asset, filters.asset === DEFAULT_FILTERS.asset);
  set('status', filters.status, filters.status === DEFAULT_FILTERS.status);
  set('provenance', filters.provenance, filters.provenance === DEFAULT_FILTERS.provenance);
  set('sort', sort.key, sort.key === DEFAULT_SORT.key);
  set('dir', sort.dir, sort.dir === DEFAULT_SORT.dir);
  set('f', selectedId ?? '', selectedId === null);
  return next;
}
