import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  DATA_SOURCE_STORAGE_KEY,
  getDefaultDataSourceMode,
  parseDataSourceMode,
  type DataSourceMode,
} from '@/lib/config/env';
import { getDataSource, type DataSource } from '@/lib/data/dataSource';

interface DataSourceContextValue {
  source: DataSource;
  mode: DataSourceMode;
  setMode: (mode: DataSourceMode) => void;
  /** Increments after a verified backend reset so every view refetches. */
  version: number;
  invalidate: () => void;
}

const DataSourceContext = createContext<DataSourceContextValue | null>(null);

function readInitialMode(initial?: DataSourceMode): DataSourceMode {
  if (initial) return initial;
  try {
    const stored = parseDataSourceMode(window.localStorage.getItem(DATA_SOURCE_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Storage can be unavailable (privacy mode); fall through to the default.
  }
  return getDefaultDataSourceMode();
}

export function DataSourceProvider({
  children,
  initialMode,
}: {
  children: ReactNode;
  initialMode?: DataSourceMode;
}) {
  const [mode, setModeState] = useState<DataSourceMode>(() => readInitialMode(initialMode));
  const [version, setVersion] = useState(0);

  const setMode = useCallback((next: DataSourceMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(DATA_SOURCE_STORAGE_KEY, next);
    } catch {
      // Non-fatal: the choice simply will not persist.
    }
  }, []);

  const invalidate = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo<DataSourceContextValue>(
    () => ({ source: getDataSource(mode), mode, setMode, version, invalidate }),
    [mode, setMode, version, invalidate],
  );

  return <DataSourceContext.Provider value={value}>{children}</DataSourceContext.Provider>;
}

export function useDataSource(): DataSourceContextValue {
  const ctx = useContext(DataSourceContext);
  if (!ctx) throw new Error('useDataSource must be used within <DataSourceProvider>');
  return ctx;
}
