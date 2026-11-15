import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, isDemoResetResponse, resetDemo } from '@/lib/api/client';
import { parseApiDate } from '@/lib/utils/format';
import { useBackendStatus } from './BackendStatusProvider';
import { useDataSource } from './DataSourceProvider';

/**
 * idle    : nothing attempted
 * pending : POST /demo/reset in flight
 * success : the backend answered 2xx with a valid body. This is the ONLY path to "success".
 * error   : the request failed; NOTHING was reset
 * preview : preview mode. NO request was sent: the local fixtures are already the baseline, so there is nothing to
 *           reset and nothing the backend could confirm. Never rendered as success.
 */
export type ResetPhase = 'idle' | 'pending' | 'success' | 'error' | 'preview';

/** The validated facts of the last backend-CONFIRMED reset (numbers and a time only; never host paths or text). */
export interface ConfirmedReset {
  scenarioId: string;
  assetsCount: number;
  findingsCount: number;
  relationshipsCount: number;
  attackPathsCount: number;
  durationMs: number;
  walVerified: boolean;
  /** The backend's own `resetAt`, parsed as UTC. null if it could not be parsed. */
  resetAt: Date | null;
}

export interface ResetState {
  phase: ResetPhase;
  /** Safe, human-readable message. Never contains stack traces or backend internals. */
  message: string | null;
  /** 'unavailable' means the backend does not implement the endpoint yet. */
  errorKind: ApiError['kind'] | null;
  at: Date | null;
  /** Set only by a backend-confirmed reset; survives later failed attempts so "last reset" stays truthful. */
  lastConfirmed: ConfirmedReset | null;
}

interface DemoResetValue extends ResetState {
  reset: () => Promise<void>;
  dismiss: () => void;
}

const INITIAL: ResetState = { phase: 'idle', message: null, errorKind: null, at: null, lastConfirmed: null };

const DemoResetContext = createContext<DemoResetValue | null>(null);

export function describeResetFailure(error: ApiError): string {
  switch (error.kind) {
    case 'unavailable':
      return 'Demo reset is not available on the backend yet. Nothing was reset.';
    case 'network':
    case 'timeout':
      return 'The backend is unreachable, so nothing was reset. Start the backend and try again.';
    case 'parse':
      return 'The backend answered, but not in the documented format. Nothing was reset.';
    default:
      return `The backend rejected the reset${error.status ? ` (HTTP ${error.status})` : ''}. Nothing was reset.`;
  }
}

export function DemoResetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ResetState>(INITIAL);
  const { refresh } = useBackendStatus();
  const { invalidate, source } = useDataSource();
  const running = useRef(false);
  const isPreview = source.origin === 'SIMULATED_DEMO';

  const reset = useCallback(async () => {
    if (running.current) return;

    // PREVIEW MODE MUST NEVER TOUCH THE BACKEND. A reset is a real, state-changing request; sending it while the UI
    // is showing local fixtures would silently alter (or fail against) a backend the user is not looking at, and the
    // result could never be displayed truthfully. Preview data is already the deterministic baseline.
    if (isPreview) {
      setState((s) => ({
        ...s,
        phase: 'preview',
        message: 'Preview mode: no request was sent and nothing was reset. The local preview data is already the baseline. Switch to Backend API to reset the real demo state.',
        errorKind: null,
        at: new Date(),
      }));
      return;
    }

    running.current = true;
    setState((s) => ({ ...s, phase: 'pending', message: 'Resetting demo scenario...', errorKind: null, at: null }));
    try {
      const result = await resetDemo();
      // Defence in depth: resetDemo() already guarantees this, but the green state must never depend on a
      // single check. Success requires a valid body, RESET_SUCCESSFUL and DEMO_MODE.
      if (!isDemoResetResponse(result) || result.status !== 'RESET_SUCCESSFUL' || result.mode !== 'DEMO_MODE') {
        throw new ApiError('parse', 'POST /demo/reset', 'The reset response was not a confirmed success.');
      }
      setState({
        phase: 'success',
        // Built from validated numeric fields only: never echoes the host path (runtimeWorkspace) or raw text.
        message:
          `Backend confirmed the reset: ${result.assetsCount} assets, ${result.findingsCount} findings, ` +
          `${result.relationshipsCount} relationships, ${result.attackPathsCount} attack path` +
          `${result.attackPathsCount === 1 ? '' : 's'} restored in ${Math.round(result.durationMs)} ms.`,
        errorKind: null,
        at: new Date(),
        lastConfirmed: {
          scenarioId: result.scenarioId,
          assetsCount: result.assetsCount,
          findingsCount: result.findingsCount,
          relationshipsCount: result.relationshipsCount,
          attackPathsCount: result.attackPathsCount,
          durationMs: result.durationMs,
          walVerified: result.walVerified,
          resetAt: parseApiDate(result.resetAt),
        },
      });
      invalidate();
      refresh();
    } catch (e) {
      const error = e instanceof ApiError ? e : new ApiError('http', 'POST /demo/reset', 'Unexpected failure.');
      // A failed attempt must not erase the record of the last CONFIRMED reset.
      setState((s) => ({ ...s, phase: 'error', message: describeResetFailure(error), errorKind: error.kind, at: new Date() }));
    } finally {
      running.current = false;
    }
  }, [invalidate, refresh, isPreview]);

  // Dismissing a message clears the banner, never the record of the last confirmed reset.
  const dismiss = useCallback(() => setState((s) => ({ ...INITIAL, lastConfirmed: s.lastConfirmed })), []);

  const value = useMemo<DemoResetValue>(() => ({ ...state, reset, dismiss }), [state, reset, dismiss]);
  return <DemoResetContext.Provider value={value}>{children}</DemoResetContext.Provider>;
}

export function useDemoReset(): DemoResetValue {
  const ctx = useContext(DemoResetContext);
  if (!ctx) throw new Error('useDemoReset must be used within <DemoResetProvider>');
  return ctx;
}
