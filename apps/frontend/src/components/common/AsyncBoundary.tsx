import type { ReactNode } from 'react';
import type { AsyncState } from '@/hooks/useAsyncData';
import { ErrorState, PanelSkeleton } from './States';

interface AsyncBoundaryProps<T> {
  state: AsyncState<T>;
  onRetry: () => void;
  children: (data: T) => ReactNode;
  skeletonRows?: number;
  label?: string;
}

/** Renders exactly one of: skeleton, error with retry, or the loaded content. Never blank. */
export function AsyncBoundary<T>({ state, onRetry, children, skeletonRows, label }: AsyncBoundaryProps<T>) {
  if (state.status === 'loading') return <PanelSkeleton rows={skeletonRows} label={label} />;
  if (state.status === 'error') return <ErrorState error={state.error} onRetry={onRetry} />;
  return <>{children(state.data)}</>;
}
