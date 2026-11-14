import type { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { DataSourceMode } from '@/lib/config/env';
import { BackendStatusProvider } from './BackendStatusProvider';
import { DataSourceProvider } from './DataSourceProvider';
import { DemoResetProvider } from './DemoResetProvider';

interface AppProvidersProps {
  children: ReactNode;
  /** Test/story hook: force the data source instead of reading localStorage/env. */
  initialMode?: DataSourceMode;
  /** Test hook: health polling interval. */
  pollIntervalMs?: number;
}

/** Global providers: error boundary, data-source choice, backend health, demo reset. */
export function AppProviders({ children, initialMode, pollIntervalMs }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <DataSourceProvider initialMode={initialMode}>
        <BackendStatusProvider pollIntervalMs={pollIntervalMs}>
          <DemoResetProvider>{children}</DemoResetProvider>
        </BackendStatusProvider>
      </DataSourceProvider>
    </ErrorBoundary>
  );
}
