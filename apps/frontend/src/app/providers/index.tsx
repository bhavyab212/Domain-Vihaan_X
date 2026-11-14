import React, { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Global App Providers Wrapper
 * Houses theme providers, error boundaries, and state context
 */
export function AppProviders({ children }: AppProvidersProps) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
