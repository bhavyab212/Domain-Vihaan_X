import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, resetDemo } from '@/lib/api/client';
import { useBackendStatus } from './BackendStatusProvider';
import { useDataSource } from './DataSourceProvider';

/**
 * idle    : nothing attempted
 * pending : POST /demo/reset in flight
 * success : the backend answered 2xx with a valid body. This is the ONLY path to "success".
 * error   : the request failed; NOTHING was reset
 */
export type ResetPhase = 'idle' | 'pending' | 'success' | 'error';

export interface ResetState {
  phase: ResetPhase;
  /** Safe, human-readable message. Never contains stack traces or backend internals. */
  message: string | null;
  /** 'unavailable' means the backend does not implement the endpoint yet. */
  errorKind: ApiError['kind'] | null;
  at: Date | null;
}

interface DemoResetValue extends ResetState {
  reset: () => Promise<void>;
  dismiss: () => void;
}

const INITIAL: ResetState = { phase: 'idle', message: null, errorKind: null, at: null };

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
  const { invalidate } = useDataSource();
  const running = useRef(false);

  const reset = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setState({ phase: 'pending', message: 'Resetting demo scenario...', errorKind: null, at: null });
    try {
      const run = await resetDemo();
      setState({
        phase: 'success',
        message: `Backend confirmed the reset: ${run.currentStepMessage}`,
        errorKind: null,
        at: new Date(),
      });
      invalidate();
      refresh();
    } catch (e) {
      const error = e instanceof ApiError ? e : new ApiError('http', 'POST /demo/reset', 'Unexpected failure.');
      setState({ phase: 'error', message: describeResetFailure(error), errorKind: error.kind, at: new Date() });
    } finally {
      running.current = false;
    }
  }, [invalidate, refresh]);

  const dismiss = useCallback(() => setState(INITIAL), []);

  const value = useMemo<DemoResetValue>(() => ({ ...state, reset, dismiss }), [state, reset, dismiss]);
  return <DemoResetContext.Provider value={value}>{children}</DemoResetContext.Provider>;
}

export function useDemoReset(): DemoResetValue {
  const ctx = useContext(DemoResetContext);
  if (!ctx) throw new Error('useDemoReset must be used within <DemoResetProvider>');
  return ctx;
}
