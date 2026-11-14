import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AppProviders } from '@/app/providers';
import { AppRoutes } from '@/app/router';
import { ROUTER_FUTURE } from '@/app/routerFuture';
import type { DataSourceMode } from '@/lib/config/env';

export type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Stubs global fetch. Unmatched requests fail like an unreachable backend. */
export function stubFetch(handler: Handler) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init));
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** Backend that is completely unreachable (connection refused / offline). */
export function stubOffline() {
  return stubFetch(() => {
    throw new TypeError('Failed to fetch');
  });
}

export const HEALTHY = { status: 'healthy', mode: 'DEMO_MODE', scanners: {} };

/** A valid openapi DemoResetResponse (shape of Dev A's TSK-002 endpoint). Override fields per test. */
export function resetBody(patch: Record<string, unknown> = {}) {
  return {
    status: 'RESET_SUCCESSFUL',
    scenarioId: 'demo-scenario-saas-breach',
    mode: 'DEMO_MODE',
    message: 'Demo scenario reset to canonical synthetic baseline.',
    assetsCount: 3,
    findingsCount: 2,
    relationshipsCount: 2,
    attackPathsCount: 1,
    runtimeWorkspace: 'data/runtime/demo_workspace/mock_saas',
    durationMs: 22.6,
    walVerified: true,
    resetAt: '2026-11-15T00:00:00Z',
    ...patch,
  };
}

export function renderApp(route = '/', mode: DataSourceMode = 'preview') {
  return render(
    <AppProviders initialMode={mode} pollIntervalMs={3_600_000}>
      <MemoryRouter initialEntries={[route]} future={ROUTER_FUTURE}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  );
}
