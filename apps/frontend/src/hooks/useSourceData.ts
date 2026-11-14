import { useDataSource } from '@/app/providers/DataSourceProvider';
import type { DataSource } from '@/lib/data/dataSource';
import { useAsyncData, type UseAsyncData } from './useAsyncData';

/**
 * Loads data through the active data source. Refetches when the user switches source or after a
 * backend-confirmed demo reset (`version`). Views never touch fixtures or the API client directly.
 */
export function useSourceData<T>(load: (source: DataSource, signal: AbortSignal) => Promise<T>): UseAsyncData<T> {
  const { source, version } = useDataSource();
  return useAsyncData((signal) => load(source, signal), [source, version]);
}
