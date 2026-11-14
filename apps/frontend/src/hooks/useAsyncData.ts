import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api/client';

export type AsyncState<T> =
  | { status: 'loading'; data: undefined; error: undefined }
  | { status: 'success'; data: T; error: undefined }
  | { status: 'error'; data: undefined; error: ApiError };

export interface UseAsyncData<T> {
  state: AsyncState<T>;
  reload: () => void;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError('http', 'client', 'The data could not be loaded.');
}

/**
 * Runs `fetcher` on mount and whenever `deps` change, with abort-on-unmount.
 * Exposes an explicit three-state result so every caller must render loading, error and success.
 */
export function useAsyncData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: ReadonlyArray<unknown>,
): UseAsyncData<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading', data: undefined, error: undefined });
  const [attempt, setAttempt] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', data: undefined, error: undefined });
    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data, error: undefined });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', data: undefined, error: toApiError(error) });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, reload };
}
