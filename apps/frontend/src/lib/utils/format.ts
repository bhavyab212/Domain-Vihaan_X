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

const HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const LOOKS_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * Parses a timestamp from the API. Dev A's backend emits ISO strings WITHOUT a timezone
 * (e.g. "2026-11-14T23:18:26.714730"). JavaScript would read those as the viewer's LOCAL time, shifting every
 * displayed time by their UTC offset. The API contract's timestamps are UTC, so a zone-less ISO string is
 * treated as UTC. Anything with an explicit Z or offset is respected as-is. Returns null if unparseable.
 */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const text = value.trim();
  const normalised = LOOKS_ISO.test(text) && !HAS_ZONE.test(text) ? `${text}Z` : text;
  const date = new Date(normalised);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Deterministic timestamp, e.g. "14 Nov, 10:05 UTC". Returns the raw value if it cannot be parsed. */
export function formatUtc(iso: string): string {
  const date = parseApiDate(iso);
  return date ? `${utcFormatter.format(date)} UTC` : iso;
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
