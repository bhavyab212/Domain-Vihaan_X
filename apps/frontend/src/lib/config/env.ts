/**
 * Centralised, validated environment access.
 * Only VITE_* values are available in the browser and they are PUBLIC: never store secrets here.
 */

/** Source of truth: contracts/openapi/openapi.yaml `servers[0].url`. */
export const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';

export type DataSourceMode = 'preview' | 'api';

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim();
  return trimTrailingSlash(raw && raw.length > 0 ? raw : DEFAULT_API_BASE_URL);
}

export function parseDataSourceMode(value: string | null | undefined): DataSourceMode | null {
  return value === 'preview' || value === 'api' ? value : null;
}

/** Initial mode before any user choice is restored from localStorage. Defaults to local preview. */
export function getDefaultDataSourceMode(): DataSourceMode {
  return parseDataSourceMode(import.meta.env.VITE_DATA_SOURCE?.trim()) ?? 'preview';
}

export const DATA_SOURCE_STORAGE_KEY = 'vihaan-x.dataSource';

/** Backend health polling interval. */
export const HEALTH_POLL_INTERVAL_MS = 20_000;
/** Per-request timeout so the UI can never spin forever. */
export const REQUEST_TIMEOUT_MS = 8_000;
