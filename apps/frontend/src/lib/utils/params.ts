/** Defensive read of an id taken from a URL search param: a trimmed string of 1 to 200 characters, or null. */
export function parseIdParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  return value.length > 0 && value.length <= 200 ? value : null;
}
