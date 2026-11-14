/**
 * PRESENTATION-ONLY category mapping (single, centralised place).
 *
 * The OpenAPI `Finding` has no `category` field, and neither does Dev A's newest (unmerged) contract. Until the
 * backend defines one, the category shown in the UI is DERIVED from the scanner identity below. It is a display
 * and filtering convenience only: it is never sent anywhere, never used for scoring, and never presented as
 * backend data. If a canonical `category` field arrives, adapt `categoryIdOf` here and nothing else changes.
 */

export type FindingCategory = 'SECRET' | 'IAC' | 'VULNERABILITY' | 'EXTERNAL' | 'OTHER';

export const CATEGORY_ORDER: FindingCategory[] = ['SECRET', 'IAC', 'VULNERABILITY', 'EXTERNAL', 'OTHER'];

/** Short labels (table cells, tabs). */
export const CATEGORY_LABEL: Record<FindingCategory, string> = {
  SECRET: 'Secret',
  IAC: 'IaC',
  VULNERABILITY: 'Vulnerability',
  EXTERNAL: 'External surface',
  OTHER: 'Other',
};

/** Longer descriptions (tooltips / accessible names). */
export const CATEGORY_DESCRIPTION: Record<FindingCategory, string> = {
  SECRET: 'Exposed credentials and secrets',
  IAC: 'Infrastructure as Code misconfiguration',
  VULNERABILITY: 'Software composition and container vulnerabilities',
  EXTERNAL: 'External attack surface',
  OTHER: 'Scanner with no category mapping',
};

const SCANNER_CATEGORY: Record<string, FindingCategory> = {
  gitleaks: 'SECRET',
  checkov: 'IAC',
  trivy: 'VULNERABILITY',
  subfinder: 'EXTERNAL',
};

export function categoryIdOf(scanner: string): FindingCategory {
  return SCANNER_CATEGORY[scanner.toLowerCase()] ?? 'OTHER';
}

export function categoryOf(scanner: string): string {
  return CATEGORY_LABEL[categoryIdOf(scanner)];
}
