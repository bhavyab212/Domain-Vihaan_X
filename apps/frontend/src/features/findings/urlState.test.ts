import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, DEFAULT_SORT } from './triage';
import { parseTriageState, serializeTriageState, type TriageState } from './urlState';

const parse = (qs: string) => parseTriageState(new URLSearchParams(qs));
const DEFAULT_STATE: TriageState = { filters: DEFAULT_FILTERS, sort: DEFAULT_SORT, selectedId: null };

describe('triage URL state', () => {
  it('parses an empty query string to the defaults', () => {
    expect(parse('')).toEqual(DEFAULT_STATE);
  });

  it('writes nothing for the default state (short links)', () => {
    expect(serializeTriageState(DEFAULT_STATE).toString()).toBe('');
  });

  it('round-trips a fully populated state', () => {
    const state: TriageState = {
      filters: { query: 'aws key', severity: 'CRITICAL', scanner: 'gitleaks', category: 'SECRET', asset: 'asset-repo-01', status: 'OPEN', provenance: 'SIMULATED' },
      sort: { key: 'title', dir: 'asc' },
      selectedId: 'find-sec-01',
    };
    const qs = serializeTriageState(state);
    expect(parseTriageState(qs)).toEqual(state);
    expect(qs.get('f')).toBe('find-sec-01');
  });

  it('omits only the values that equal their default', () => {
    const qs = serializeTriageState({ ...DEFAULT_STATE, filters: { ...DEFAULT_FILTERS, severity: 'HIGH' } });
    expect(qs.toString()).toBe('severity=HIGH');
  });

  it('preserves unrelated params and removes stale triage params', () => {
    const base = new URLSearchParams('utm=keep&severity=HIGH&f=old');
    const next = serializeTriageState(DEFAULT_STATE, base);
    expect(next.get('utm')).toBe('keep');
    expect(next.has('severity')).toBe(false);
    expect(next.has('f')).toBe(false);
  });

  it.each([
    ['unknown severity', 'severity=EXTREME', 'severity', 'ALL'],
    ['lowercase severity', 'severity=critical', 'severity', 'ALL'],
    ['unknown category', 'category=MALWARE', 'category', 'ALL'],
    ['unknown status', 'status=FIXED', 'status', 'ALL'],
    ['unknown provenance', 'provenance=TRUSTED', 'provenance', 'ALL'],
  ] as const)('falls back to ALL for %s', (_n, qs, key, expected) => {
    expect(parse(qs).filters[key]).toBe(expected);
  });

  it('falls back to the default sort for an unknown key or direction', () => {
    expect(parse('sort=bogus&dir=sideways').sort).toEqual(DEFAULT_SORT);
    expect(parse('sort=title').sort).toEqual({ key: 'title', dir: DEFAULT_SORT.dir });
  });

  it('caps free-text length and treats blank values as unset', () => {
    expect(parse(`q=${'x'.repeat(5000)}`).filters.query).toHaveLength(200);
    expect(parse('scanner=&asset=&f=').filters.scanner).toBe('ALL');
    expect(parse('scanner=&asset=&f=').selectedId).toBeNull();
  });

  it('keeps hostile text as inert data (it is only ever rendered as text)', () => {
    const state = parse('q=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    expect(state.filters.query).toBe('<script>alert(1)</script>');
  });
});
