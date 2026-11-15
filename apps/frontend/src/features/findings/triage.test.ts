import { describe, expect, it } from 'vitest';
import { PREVIEW_ASSETS, PREVIEW_FINDINGS } from '@/mocks/fixtures';
import { indexById } from '@/lib/utils/format';
import type { SecurityFinding } from '@/types';
import { categoryIdOf, categoryOf } from './categories';
import {
  activeFilterKeys,
  applyFilters,
  categoryCounts,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  nextSort,
  provenanceGroupOf,
  severityWeight,
  sortFindings,
  type TriageFilters,
} from './triage';

export function makeFinding(patch: Partial<SecurityFinding> & { id: string }): SecurityFinding {
  return {
    title: patch.id,
    description: `description of ${patch.id}`,
    severity: 'MEDIUM',
    scanner: 'trivy',
    assetId: 'asset-repo-01',
    provenance: 'OBSERVED',
    status: 'OPEN',
    discoveredAt: '2026-11-14T10:00:00Z',
    ...patch,
  };
}

const SET: SecurityFinding[] = [
  makeFinding({ id: 'a', title: 'Alpha secret', severity: 'CRITICAL', scanner: 'gitleaks', assetId: 'asset-repo-01', provenance: 'SIMULATED_DEMO', discoveredAt: '2026-11-14T10:05:00Z', location: { file: 'config/staging.env', line: 14 } }),
  makeFinding({ id: 'b', title: 'Bravo iac', severity: 'HIGH', scanner: 'checkov', assetId: 'asset-cloud-01', provenance: 'SIMULATED', discoveredAt: '2026-11-14T10:06:00Z', status: 'IN_REMEDIATION' }),
  makeFinding({ id: 'c', title: 'Charlie dependency', severity: 'MEDIUM', scanner: 'trivy', assetId: 'asset-repo-01', provenance: 'OBSERVED', discoveredAt: '2026-11-14T09:00:00Z' }),
  makeFinding({ id: 'd', title: 'delta domain', severity: 'LOW', scanner: 'subfinder', assetId: 'asset-storage-01', provenance: 'INFERRED', discoveredAt: '2026-11-14T11:00:00Z', status: 'RESOLVED' }),
  makeFinding({ id: 'e', title: 'Echo mystery', severity: 'CRITICAL', scanner: 'someotherscanner', assetId: 'asset-repo-01', provenance: 'OBSERVED', discoveredAt: '2026-11-14T08:00:00Z' }),
];
const assets = indexById(PREVIEW_ASSETS);
const ids = (list: SecurityFinding[]) => list.map((f) => f.id);
const withFilters = (patch: Partial<TriageFilters>): TriageFilters => ({ ...DEFAULT_FILTERS, ...patch });

describe('category mapping (centralised, display-only)', () => {
  it('maps the known scanners and falls back to Other', () => {
    expect(categoryIdOf('gitleaks')).toBe('SECRET');
    expect(categoryIdOf('checkov')).toBe('IAC');
    expect(categoryIdOf('trivy')).toBe('VULNERABILITY');
    expect(categoryIdOf('subfinder')).toBe('EXTERNAL');
    expect(categoryIdOf('never-heard-of-it')).toBe('OTHER');
  });
  it('is case-insensitive and exposes a label', () => {
    expect(categoryIdOf('GitLeaks')).toBe('SECRET');
    expect(categoryOf('checkov')).toBe('IaC');
  });
});

describe('severity and provenance helpers', () => {
  it('ranks CRITICAL highest and tolerates unknown values', () => {
    expect(severityWeight('CRITICAL')).toBeGreaterThan(severityWeight('HIGH'));
    expect(severityWeight('LOW')).toBeGreaterThan(severityWeight('INFORMATIONAL'));
    expect(severityWeight('WAT' as never)).toBe(0);
  });
  it('groups SIMULATED_DEMO and legacy SIMULATED together, distinct from observed and inferred', () => {
    expect(provenanceGroupOf({ provenance: 'SIMULATED_DEMO' })).toBe('SIMULATED');
    expect(provenanceGroupOf({ provenance: 'SIMULATED' })).toBe('SIMULATED');
    expect(provenanceGroupOf({ provenance: 'OBSERVED' })).toBe('OBSERVED');
    expect(provenanceGroupOf({ provenance: 'INFERRED' })).toBe('INFERRED');
  });
});

describe('applyFilters actually changes the visible records', () => {
  it('returns everything for the default filters', () => {
    expect(applyFilters(SET, DEFAULT_FILTERS, assets)).toHaveLength(5);
  });
  it.each<[string, Partial<TriageFilters>, string[]]>([
    ['severity', { severity: 'CRITICAL' }, ['a', 'e']],
    ['scanner', { scanner: 'trivy' }, ['c']],
    ['category', { category: 'IAC' }, ['b']],
    ['category OTHER (unmapped scanner)', { category: 'OTHER' }, ['e']],
    ['asset', { asset: 'asset-repo-01' }, ['a', 'c', 'e']],
    ['status', { status: 'RESOLVED' }, ['d']],
    ['provenance simulated groups demo + legacy', { provenance: 'SIMULATED' }, ['a', 'b']],
    ['provenance observed', { provenance: 'OBSERVED' }, ['c', 'e']],
    ['provenance inferred', { provenance: 'INFERRED' }, ['d']],
  ])('filters by %s', (_n, patch, expected) => {
    expect(ids(applyFilters(SET, withFilters(patch), assets)).sort()).toEqual(expected);
  });

  it('combines filters with AND', () => {
    expect(ids(applyFilters(SET, withFilters({ severity: 'CRITICAL', asset: 'asset-repo-01', provenance: 'OBSERVED' }), assets))).toEqual(['e']);
    expect(applyFilters(SET, withFilters({ severity: 'LOW', scanner: 'gitleaks' }), assets)).toEqual([]);
  });

  it('searches title, description, id, scanner, asset name and location, case-insensitively', () => {
    const find = (query: string) => ids(applyFilters(SET, withFilters({ query }), assets)).sort();
    expect(find('ALPHA')).toEqual(['a']);
    expect(find('description of c')).toEqual(['c']);
    expect(find('checkov')).toEqual(['b']);
    expect(find('aws-production-account')).toEqual(['b']); // asset NAME, not id
    expect(find('staging.env')).toEqual(['a']); // location
    expect(find('zzz-nothing')).toEqual([]);
    expect(find('   ')).toHaveLength(5);
  });

  it('does not mutate its input', () => {
    const copy = structuredClone(SET);
    applyFilters(SET, withFilters({ severity: 'LOW' }), assets);
    sortFindings(SET, DEFAULT_SORT);
    expect(SET).toEqual(copy);
  });
});

describe('sorting', () => {
  it('defaults to most severe first, then newest first', () => {
    expect(ids(sortFindings(SET, DEFAULT_SORT))).toEqual(['a', 'e', 'b', 'c', 'd']);
  });
  it.each<[string, Parameters<typeof sortFindings>[1], string[]]>([
    ['severity asc', { key: 'severity', dir: 'asc' }, ['d', 'c', 'b', 'a', 'e']],
    ['title asc (case-insensitive)', { key: 'title', dir: 'asc' }, ['a', 'b', 'c', 'd', 'e']],
    ['title desc', { key: 'title', dir: 'desc' }, ['e', 'd', 'c', 'b', 'a']],
    ['scanner asc', { key: 'scanner', dir: 'asc' }, ['b', 'a', 'e', 'd', 'c']],
    ['discovered desc', { key: 'discovered', dir: 'desc' }, ['d', 'b', 'a', 'c', 'e']],
    ['discovered asc', { key: 'discovered', dir: 'asc' }, ['e', 'c', 'a', 'b', 'd']],
  ])('sorts by %s', (_n, sort, expected) => {
    expect(ids(sortFindings(SET, sort))).toEqual(expected);
  });
  it('is stable regardless of input order', () => {
    expect(ids(sortFindings([...SET].reverse(), DEFAULT_SORT))).toEqual(ids(sortFindings(SET, DEFAULT_SORT)));
  });
  it('flips direction on the same column and uses sensible defaults for a new one', () => {
    expect(nextSort({ key: 'severity', dir: 'desc' }, 'severity')).toEqual({ key: 'severity', dir: 'asc' });
    expect(nextSort({ key: 'severity', dir: 'asc' }, 'severity')).toEqual({ key: 'severity', dir: 'desc' });
    expect(nextSort(DEFAULT_SORT, 'title')).toEqual({ key: 'title', dir: 'asc' });
    expect(nextSort(DEFAULT_SORT, 'discovered')).toEqual({ key: 'discovered', dir: 'desc' });
  });
});

describe('tab counts and active filters', () => {
  it('counts categories among findings matching every OTHER filter', () => {
    expect(categoryCounts(SET, DEFAULT_FILTERS, assets)).toEqual({ SECRET: 1, IAC: 1, VULNERABILITY: 1, EXTERNAL: 1, OTHER: 1 });
    const critical = categoryCounts(SET, withFilters({ severity: 'CRITICAL' }), assets);
    expect(critical).toEqual({ SECRET: 1, IAC: 0, VULNERABILITY: 0, EXTERNAL: 0, OTHER: 1 });
  });
  it('does not let the category filter itself shrink the tab counts', () => {
    expect(categoryCounts(SET, withFilters({ category: 'IAC' }), assets)).toEqual({ SECRET: 1, IAC: 1, VULNERABILITY: 1, EXTERNAL: 1, OTHER: 1 });
  });
  it('lists only non-default filters (blank search is not active)', () => {
    expect(activeFilterKeys(DEFAULT_FILTERS)).toEqual([]);
    expect(activeFilterKeys(withFilters({ query: '  ' }))).toEqual([]);
    expect(activeFilterKeys(withFilters({ query: 'x', status: 'OPEN', severity: 'HIGH' })).sort()).toEqual(['query', 'severity', 'status']);
  });
});

describe('against the real preview fixtures', () => {
  it('both documented findings are simulated and map to Secret and IaC', () => {
    expect(PREVIEW_FINDINGS.map((f) => categoryOf(f.scanner))).toEqual(['Secret', 'IaC']);
    expect(applyFilters(PREVIEW_FINDINGS, withFilters({ provenance: 'OBSERVED' }), assets)).toEqual([]);
    expect(applyFilters(PREVIEW_FINDINGS, withFilters({ provenance: 'SIMULATED' }), assets)).toHaveLength(2);
  });
});
