import { describe, expect, it } from 'vitest';
import {
  ApiError,
  getAssets,
  getAttackPaths,
  getFindings,
  getHealth,
  getSecurityGraph,
  isDemoResetResponse,
  resetDemo,
} from './client';
import { HEALTHY, json, resetBody, stubFetch, stubOffline } from '@/test/utils';

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (e) {
    return e as ApiError;
  }
  throw new Error('expected the request to fail');
}

describe('API client', () => {
  it('uses the OpenAPI base URL and documented paths', async () => {
    const fetchMock = stubFetch(() => json(HEALTHY));
    await getHealth();
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/v1/health');
  });

  it('resets via POST /demo/reset and returns the validated DemoResetResponse', async () => {
    const fetchMock = stubFetch(() => json(resetBody()));
    await expect(resetDemo()).resolves.toMatchObject({ status: 'RESET_SUCCESSFUL', mode: 'DEMO_MODE', assetsCount: 3 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/demo/reset');
    expect(init?.method).toBe('POST');
  });

  describe('reset response validation (never a false success)', () => {
    it('accepts the canonical backend example', () => {
      expect(isDemoResetResponse(resetBody())).toBe(true);
    });

    it.each<[string, Record<string, unknown>]>([
      ['the old AssessmentRun shape', { id: 'run-1', status: 'completed', currentStepMessage: 'ok', mode: 'DEMO_MODE' }],
      ['status is not a known value', { status: 'OK' }],
      ['mode is LIVE_ASSESSMENT_MODE', { mode: 'LIVE_ASSESSMENT_MODE' }],
      ['scenarioId is empty', { scenarioId: '' }],
      ['a count is missing', { assetsCount: undefined }],
      ['a count is negative', { findingsCount: -1 }],
      ['a count is not an integer', { relationshipsCount: 1.5 }],
      ['a count is a string', { attackPathsCount: '1' }],
      ['durationMs is not finite', { durationMs: 'fast' }],
      ['walVerified is not a boolean', { walVerified: 'yes' }],
      ['resetAt is not a date', { resetAt: 'yesterday-ish' }],
      ['runtimeWorkspace is missing', { runtimeWorkspace: undefined }],
      ['message is missing', { message: undefined }],
    ])('rejects a 2xx body where %s', async (_name, patch) => {
      const body = _name.startsWith('the old') ? patch : resetBody(patch);
      expect(isDemoResetResponse(body)).toBe(false);
      stubFetch(() => json(body));
      expect((await failure(resetDemo())).kind).toBe('parse');
    });

    it.each([null, 'RESET_SUCCESSFUL', 42, [], [resetBody()]])('rejects a non-object body: %j', async (body) => {
      expect(isDemoResetResponse(body)).toBe(false);
      stubFetch(() => json(body));
      expect((await failure(resetDemo())).kind).toBe('parse');
    });

    it('rejects a structurally valid RESET_FAILED response as a failure', async () => {
      stubFetch(() => json(resetBody({ status: 'RESET_FAILED', message: 'could not restore workspace' })));
      const error = await failure(resetDemo());
      expect(error.kind).toBe('http');
      expect(error.message).not.toContain('could not restore workspace');
    });
  });

  it('passes the documented findings query parameters', async () => {
    const fetchMock = stubFetch(() => json([]));
    await getFindings({ severity: 'CRITICAL', assetId: 'asset-repo-01' });
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/v1/findings?severity=CRITICAL&asset_id=asset-repo-01');
  });

  it('classifies an unreachable backend as a network error', async () => {
    stubOffline();
    const error = await failure(getAssets());
    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe('network');
  });

  it.each([404, 405, 501])('classifies HTTP %i as "unavailable" (endpoint not implemented)', async (status) => {
    stubFetch(() => json({ detail: 'nope' }, status));
    const error = await failure(resetDemo());
    expect(error.kind).toBe('unavailable');
    expect(error.status).toBe(status);
  });

  it('classifies 500 as an http error without leaking the response body', async () => {
    stubFetch(() => json({ detail: 'Traceback (most recent call last): secret-token-123' }, 500));
    const error = await failure(getAssets());
    expect(error.kind).toBe('http');
    expect(error.message).not.toContain('secret-token-123');
    expect(error.message).not.toContain('Traceback');
  });

  it('rejects a non-array assets body and a graph without nodes/edges', async () => {
    stubFetch(() => json({ not: 'an array' }));
    expect((await failure(getAssets())).kind).toBe('parse');
    expect((await failure(getSecurityGraph())).kind).toBe('parse');
  });

  it('rejects invalid JSON', async () => {
    stubFetch(() => new Response('<html>oops</html>', { status: 200 }));
    expect((await failure(getHealth())).kind).toBe('parse');
  });

  it('documents that /attack-paths is not in openapi.yaml: a 404 surfaces as unavailable', async () => {
    stubFetch(() => json({}, 404));
    expect((await failure(getAttackPaths())).kind).toBe('unavailable');
  });
});
