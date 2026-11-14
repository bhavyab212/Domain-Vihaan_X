import type { AssetType, GraphRelationship } from '@/types';

const utcFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const clockFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** Deterministic timestamp, e.g. "14 Nov, 10:05 UTC". Returns the raw value if it cannot be parsed. */
export function formatUtc(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : `${utcFormatter.format(date)} UTC`;
}

/** Local wall-clock time of day, e.g. "02:14:05". */
export function formatClock(date: Date): string {
  return clockFormatter.format(date);
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function humanizeRelationship(relationship: GraphRelationship): string {
  return relationship.toLowerCase().replace(/_/g, ' ');
}

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  REPOSITORY: 'Repository',
  CLOUD_ACCOUNT: 'Cloud account',
  DOMAIN: 'Domain',
  WEB_APPLICATION: 'Web application',
  API_ENDPOINT: 'API endpoint',
  DATABASE: 'Data store',
};

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function indexById<T extends { id: string }>(items: T[] | undefined): Record<string, T> {
  const index: Record<string, T> = {};
  for (const item of items ?? []) index[item.id] = item;
  return index;
}
