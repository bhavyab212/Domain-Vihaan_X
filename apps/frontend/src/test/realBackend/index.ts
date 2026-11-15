/**
 * Payloads captured from Dev A's REAL backend (branch backend/TSK-009-011-014-security-operations @ c68502d), run
 * read-only from a temporary export, after POST /demo/reset. They are NOT hand-written fixtures: they exist so tests
 * pin the UI to what the backend actually emits (node.data.type not assetType, null findingId, timezone-less dates,
 * empty /assets and /findings).
 *
 * Capture: GET /graph, GET /graph?include_findings=true, GET /attack-paths. /assets and /findings returned [].
 * Re-capture when Dev A changes the contract; the contract test below will then tell you what drifted.
 */
import graphJson from './graph.json';
import graphWithFindingsJson from './graph-with-findings.json';
import attackPathsJson from './attack-paths.json';
import type { AttackPath, SecurityGraph } from '@/types';

export const REAL_BACKEND_COMMIT = 'c68502d';
export const REAL_GRAPH = graphJson as unknown as SecurityGraph;
export const REAL_GRAPH_WITH_FINDINGS = graphWithFindingsJson as unknown as SecurityGraph;
export const REAL_ATTACK_PATHS = attackPathsJson as unknown as AttackPath[];
