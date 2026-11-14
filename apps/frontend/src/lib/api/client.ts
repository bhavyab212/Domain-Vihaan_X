/**
 * Centralised, typed API client for the Domain-Vihaan_X control plane.
 *
 * CONTRACT: contracts/openapi/openapi.yaml (servers[0].url = http://localhost:8000/api/v1).
 * Responses are bare JSON as declared by OpenAPI. The `{success,data,meta}` envelope described in
 * docs/02-architecture/API_CONTRACT.md is NOT used by the OpenAPI document; this client follows the
 * OpenAPI file and surfaces a visible "unexpected response shape" error if the backend disagrees.
 *
 * No component may call fetch directly. Everything goes through this module.
 */

import { getApiBaseUrl, REQUEST_TIMEOUT_MS } from '@/lib/config/env';
import type {
  AttackPath,
  DemoResetResponse,
  DigitalAsset,
  HealthResponse,
  RemediationAction,
  RemediationApproveRequest,
  SecurityFinding,
  SecurityGraph,
  SeverityLevel,
} from '@/types';

/** Paths relative to the API base URL. */
export const ENDPOINTS = {
  health: '/health',
  assets: '/assets',
  findings: '/findings',
  graph: '/graph',
  /** NOT declared in openapi.yaml; documented only in API_CONTRACT.md. See getAttackPaths(). */
  attackPaths: '/attack-paths',
  remediations: '/remediations',
  approveRemediation: (id: string) => `/remediations/${encodeURIComponent(id)}/approve`,
  demoReset: '/demo/reset',
} as const;

export type ApiErrorKind =
  /** Could not reach the backend (offline, refused, CORS). */
  | 'network'
  | 'timeout'
  /** 404 / 405 / 501: the endpoint is not implemented (yet). */
  | 'unavailable'
  | 'http'
  /** Reachable, but the body is not the documented shape. */
  | 'parse';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly endpoint: string;

  constructor(kind: ApiErrorKind, endpoint: string, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.endpoint = endpoint;
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string | undefined>;
  signal?: AbortSignal;
}

function buildPath(path: string, query?: Record<string, string | undefined>) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
  const { method = 'GET', body, query, signal } = options;
  const fullPath = buildPath(path, query);
  const endpoint = `${method} ${fullPath}`;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener('abort', forwardAbort);

  try {
    let response: Response;
    try {
      response = await fetch(`${getApiBaseUrl()}${fullPath}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (signal?.aborted) throw error; // the caller cancelled; not a failure to report
      if (timedOut) {
        throw new ApiError('timeout', endpoint, `The backend did not respond within ${REQUEST_TIMEOUT_MS / 1000}s.`);
      }
      throw new ApiError('network', endpoint, 'The backend could not be reached.');
    }

    if (!response.ok) {
      const unavailable = response.status === 404 || response.status === 405 || response.status === 501;
      throw new ApiError(
        unavailable ? 'unavailable' : 'http',
        endpoint,
        unavailable
          ? 'This endpoint is not available on the backend yet.'
          : `The backend responded with HTTP ${response.status}.`,
        response.status,
      );
    }

    try {
      return await response.json();
    } catch {
      throw new ApiError('parse', endpoint, 'The backend returned a response that is not valid JSON.', response.status);
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shapeError(endpoint: string, expected: string): ApiError {
  return new ApiError('parse', endpoint, `Unexpected response shape: expected ${expected}.`);
}

function expectArray<T>(endpoint: string, value: unknown): T[] {
  if (!Array.isArray(value)) throw shapeError(endpoint, 'a JSON array');
  return value as T[];
}

/** GET /health */
export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const data = await request(ENDPOINTS.health, { signal });
  if (!isRecord(data) || typeof data.status !== 'string') {
    throw shapeError(`GET ${ENDPOINTS.health}`, 'an object with a string "status"');
  }
  return data as unknown as HealthResponse;
}

/** GET /assets */
export async function getAssets(signal?: AbortSignal): Promise<DigitalAsset[]> {
  return expectArray<DigitalAsset>(`GET ${ENDPOINTS.assets}`, await request(ENDPOINTS.assets, { signal }));
}

export interface FindingsQuery {
  severity?: SeverityLevel;
  assetId?: string;
}

/** GET /findings (optional `severity` and `asset_id` query parameters per OpenAPI). */
export async function getFindings(query: FindingsQuery = {}, signal?: AbortSignal): Promise<SecurityFinding[]> {
  const data = await request(ENDPOINTS.findings, {
    query: { severity: query.severity, asset_id: query.assetId },
    signal,
  });
  return expectArray<SecurityFinding>(`GET ${ENDPOINTS.findings}`, data);
}

/** GET /graph */
export async function getSecurityGraph(signal?: AbortSignal): Promise<SecurityGraph> {
  const data = await request(ENDPOINTS.graph, { signal });
  if (!isRecord(data) || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw shapeError(`GET ${ENDPOINTS.graph}`, 'an object with "nodes" and "edges" arrays');
  }
  return data as unknown as SecurityGraph;
}

/**
 * GET /attack-paths.
 * CONTRACT GAP: this path is NOT declared in openapi.yaml (only API_CONTRACT.md section 3.7 mentions it,
 * under a different base URL and envelope). It is kept here so the UI is ready; until the contract is
 * jointly updated, a 404 is reported as "not available on the backend yet" and the UI shows that state.
 */
export async function getAttackPaths(signal?: AbortSignal): Promise<AttackPath[]> {
  return expectArray<AttackPath>(
    `GET ${ENDPOINTS.attackPaths}`,
    await request(ENDPOINTS.attackPaths, { signal }),
  );
}

/** GET /remediations */
export async function getRemediations(signal?: AbortSignal): Promise<RemediationAction[]> {
  return expectArray<RemediationAction>(
    `GET ${ENDPOINTS.remediations}`,
    await request(ENDPOINTS.remediations, { signal }),
  );
}

/** POST /remediations/{id}/approve. Human approval gate; the backend decides what happens next. */
export async function approveRemediation(
  id: string,
  payload: RemediationApproveRequest,
  signal?: AbortSignal,
): Promise<RemediationAction> {
  const path = ENDPOINTS.approveRemediation(id);
  const data = await request(path, { method: 'POST', body: payload, signal });
  if (!isRecord(data) || typeof data.id !== 'string' || typeof data.status !== 'string') {
    throw shapeError(`POST ${path}`, 'a RemediationAction');
  }
  return data as unknown as RemediationAction;
}

const RESET_COUNT_FIELDS = ['assetsCount', 'findingsCount', 'relationshipsCount', 'attackPathsCount'] as const;

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Strict type guard for the openapi `DemoResetResponse` (every field is `required` there).
 * A body that fails this guard can never be reported as a successful reset.
 */
export function isDemoResetResponse(value: unknown): value is DemoResetResponse {
  if (!isRecord(value)) return false;
  return (
    (value.status === 'RESET_SUCCESSFUL' || value.status === 'RESET_FAILED') &&
    value.mode === 'DEMO_MODE' &&
    typeof value.scenarioId === 'string' &&
    value.scenarioId.length > 0 &&
    typeof value.message === 'string' &&
    RESET_COUNT_FIELDS.every((field) => isCount(value[field])) &&
    typeof value.runtimeWorkspace === 'string' &&
    typeof value.durationMs === 'number' &&
    Number.isFinite(value.durationMs) &&
    value.durationMs >= 0 &&
    typeof value.walVerified === 'boolean' &&
    typeof value.resetAt === 'string' &&
    !Number.isNaN(Date.parse(value.resetAt))
  );
}

/**
 * POST /demo/reset.
 * Resolves ONLY for an HTTP 2xx whose body is a valid DemoResetResponse with
 * `status === "RESET_SUCCESSFUL"` and `mode === "DEMO_MODE"`. Everything else rejects, and callers must
 * treat every rejection as "nothing was reset":
 *   - malformed / wrong-shape 2xx  -> ApiError kind "parse"
 *   - valid body with RESET_FAILED -> ApiError kind "http" (the backend itself says it failed)
 */
export async function resetDemo(signal?: AbortSignal): Promise<DemoResetResponse> {
  const endpoint = `POST ${ENDPOINTS.demoReset}`;
  const data = await request(ENDPOINTS.demoReset, { method: 'POST', signal });
  if (!isDemoResetResponse(data)) {
    throw shapeError(endpoint, 'a DemoResetResponse (status, scenarioId, mode, counts, walVerified, resetAt)');
  }
  if (data.status !== 'RESET_SUCCESSFUL') {
    throw new ApiError('http', endpoint, 'The backend reported that the demo reset failed.');
  }
  return data;
}
