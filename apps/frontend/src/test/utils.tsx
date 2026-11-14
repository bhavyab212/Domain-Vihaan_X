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

export function renderApp(route = '/', mode: DataSourceMode = 'preview') {
  return render(
    <AppProviders initialMode={mode} pollIntervalMs={3_600_000}>
      <MemoryRouter initialEntries={[route]} future={ROUTER_FUTURE}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  );
}
