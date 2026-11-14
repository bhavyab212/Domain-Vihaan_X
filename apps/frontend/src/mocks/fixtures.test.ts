import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PREVIEW_ASSETS,
  PREVIEW_ATTACK_PATHS,
  PREVIEW_EVIDENCE,
  PREVIEW_FINDINGS,
  PREVIEW_GRAPH,
  PREVIEW_PROVENANCE,
  PREVIEW_REMEDIATIONS,
} from './fixtures';
import { previewDataSource } from '@/lib/data/dataSource';

// The documented synthetic scenario that Developer A's backend seeds from.
const scenario = JSON.parse(readFileSync(resolve(__dirname, '../../../../data/demo/scenario.json'), 'utf8'));
const relationships = JSON.parse(readFileSync(resolve(__dirname, '../../../../data/demo/relationships.json'), 'utf8'));

describe('preview fixtures (SIMULATED_DEMO)', () => {
  it('identify themselves as simulated demo data', () => {
    expect(PREVIEW_PROVENANCE).toBe('SIMULATED_DEMO');
    expect(previewDataSource.origin).toBe('SIMULATED_DEMO');
    expect(scenario.isSimulated).toBe(true);
  });

  it('mark every finding SIMULATED_DEMO (canonical), never OBSERVED', () => {
    expect(PREVIEW_FINDINGS.length).toBeGreaterThan(0);
    for (const finding of PREVIEW_FINDINGS) expect(finding.provenance).toBe('SIMULATED_DEMO');
  });

  it('mark every attack path as simulated', () => {
    for (const path of PREVIEW_ATTACK_PATHS) expect(path.isSimulated).toBe(true);
  });

  it('match the documented scenario assets and findings exactly (no invented records)', () => {
    expect(PREVIEW_ASSETS.map((a) => a.id)).toEqual(scenario.assets.map((a: { id: string }) => a.id));
    expect(PREVIEW_FINDINGS.map((f) => f.id)).toEqual(scenario.findings.map((f: { id: string }) => f.id));
    for (const documented of scenario.findings) {
      const mine = PREVIEW_FINDINGS.find((f) => f.id === documented.id)!;
      expect(mine.severity).toBe(documented.severity);
      expect(mine.scanner).toBe(documented.scanner);
      expect(mine.assetId).toBe(documented.assetId);
      expect(mine.cvssScore).toBe(documented.cvssScore);
      expect(mine.location).toEqual(documented.location);
    }
  });

  it('match the documented attack path steps', () => {
    const documented = scenario.attackPaths[0];
    const mine = PREVIEW_ATTACK_PATHS[0];
    expect(mine.id).toBe(documented.id);
    expect(mine.confidenceScore).toBe(documented.confidenceScore);
    expect(mine.steps).toEqual(documented.steps);
  });

  it('include the documented relationships verbatim, marked inferred', () => {
    for (const rel of relationships) {
      const edge = PREVIEW_GRAPH.edges.find((e) => e.id === rel.id);
      expect(edge).toEqual(rel);
      expect(edge?.inferred).toBe(true);
    }
  });

  it('only reference known nodes from graph edges', () => {
    const ids = new Set(PREVIEW_GRAPH.nodes.map((n) => n.id));
    for (const edge of PREVIEW_GRAPH.edges) {
      expect(ids.has(edge.source)).toBe(true);
      expect(ids.has(edge.target)).toBe(true);
    }
  });

  it('never ship real-looking secrets or invented CVEs', () => {
    const blob = JSON.stringify([PREVIEW_FINDINGS, PREVIEW_EVIDENCE, PREVIEW_REMEDIATIONS]);
    expect(blob).not.toContain('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    expect(blob).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(blob).not.toMatch(/CVE-\d{4}-\d+/);
    for (const finding of PREVIEW_FINDINGS) expect(finding.cveId ?? null).toBeNull();
  });

  it('start every remediation as pending and unverified (nothing pre-applied)', () => {
    for (const r of PREVIEW_REMEDIATIONS) {
      expect(r.status).toBe('PENDING');
      expect(r.verificationStatus).toBe('UNVERIFIED');
    }
  });
});
