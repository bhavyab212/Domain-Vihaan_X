import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, getHealth } from '@/lib/api/client';
import { HEALTH_POLL_INTERVAL_MS } from '@/lib/config/env';
import type { HealthResponse } from '@/types';

/**
 * connecting : first probe in flight (never claims online or offline yet)
 * online     : last GET /health succeeded and parsed
 * offline    : last GET /health failed; `error` says why
 */
export type BackendStatus = 'connecting' | 'online' | 'offline';

export interface BackendStatusValue {
  status: BackendStatus;
  health: HealthResponse | null;
  error: ApiError | null;
  lastCheckedAt: Date | null;
  /** True while any probe (including the first) is running. */
  checking: boolean;
  refresh: () => void;
}

const BackendStatusContext = createContext<BackendStatusValue | null>(null);

export function BackendStatusProvider({
  children,
  pollIntervalMs = HEALTH_POLL_INTERVAL_MS,
}: {
  children: ReactNode;
  pollIntervalMs?: number;
}) {
  const [status, setStatus] = useState<BackendStatus>('connecting');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [checking, setChecking] = useState(true);
  const inFlight = useRef<AbortController | null>(null);

  const probe = useCallback(async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setChecking(true);
    try {
      const result = await getHealth(controller.signal);
      if (controller.signal.aborted) return;
      setHealth(result);
      setError(null);
      setStatus('online');
    } catch (e) {
      if (controller.signal.aborted) return;
      setHealth(null);
      setError(e instanceof ApiError ? e : new ApiError('network', 'GET /health', 'The backend could not be reached.'));
      setStatus('offline');
    } finally {
      if (!controller.signal.aborted) {
        setLastCheckedAt(new Date());
        setChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    void probe();
    const timer = window.setInterval(() => void probe(), pollIntervalMs);
    return () => {
      window.clearInterval(timer);
      inFlight.current?.abort();
    };
  }, [probe, pollIntervalMs]);

  const value = useMemo<BackendStatusValue>(
    () => ({ status, health, error, lastCheckedAt, checking, refresh: () => void probe() }),
    [status, health, error, lastCheckedAt, checking, probe],
  );

  return <BackendStatusContext.Provider value={value}>{children}</BackendStatusContext.Provider>;
}

export function useBackendStatus(): BackendStatusValue {
  const ctx = useContext(BackendStatusContext);
  if (!ctx) throw new Error('useBackendStatus must be used within <BackendStatusProvider>');
  return ctx;
}
