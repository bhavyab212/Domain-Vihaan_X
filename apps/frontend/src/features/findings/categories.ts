/**
 * PRESENTATION-ONLY label mapping.
 *
 * The OpenAPI Finding has no `category` field (API_CONTRACT.md lists one in its own, different
 * payload). Until the contract defines it, we show a descriptive label derived from the scanner name.
 * It is purely a display convenience: it is never used for scoring or any security decision.
 */
const SCANNER_CATEGORY: Record<string, string> = {
  gitleaks: 'Secret',
  checkov: 'IaC',
  trivy: 'Dependency / container',
  subfinder: 'External surface',
};

export function categoryOf(scanner: string): string {
  return SCANNER_CATEGORY[scanner.toLowerCase()] ?? 'Other';
}
