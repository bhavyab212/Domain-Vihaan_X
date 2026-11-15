/**
 * Display-time secret redaction: a safety net for anything the UI renders from backend text (diffs, scripts).
 *
 * The backend is expected to send already-masked evidence (the fixtures do). This exists because a security product must
 * not rely on that: if a raw credential ever arrives, it must not reach the screen, the clipboard, or a screenshot.
 * It only ever REMOVES information. Values that are already masked (`wJal****EKEY`), variable references
 * (`${VAULT_KEY}`) and placeholders (`<scoped-bucket>`) are left alone, because they contain characters the secret
 * patterns do not match.
 */

const MASK = '****REDACTED****';

const PATTERNS: { re: RegExp; replace: string | ((...m: string[]) => string) }[] = [
  // PEM private key blocks, including their body
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g, replace: '[private key redacted]' },
  // AWS access key ids: keep the 4-char prefix so the kind stays recognisable
  { re: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, replace: (_m, prefix) => `${prefix}****************` },
  // GitHub, Slack and generic sk- style tokens
  { re: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g, replace: '$1_****REDACTED****' as unknown as string },
  { re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, replace: 'github_pat_****REDACTED****' },
  { re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g, replace: 'xox*-****REDACTED****' },
  { re: /\bsk-[A-Za-z0-9_-]{20,}\b/g, replace: 'sk-****REDACTED****' },
  // name = value where the NAME says it is a secret and the VALUE is a long literal (not masked, not ${ref}, not <placeholder>)
  {
    re: /((?:secret|password|passwd|token|api[_-]?key|access[_-]?key|private[_-]?key)[A-Za-z0-9_]*\s*[=:]\s*)(["']?)([A-Za-z0-9/+_.-]{12,})\2/gi,
    replace: (_m, name, quote) => `${name}${quote}${MASK}${quote}`,
  },
];

export function redactSecrets(text: string): string {
  let out = text;
  for (const { re, replace } of PATTERNS) {
    out = out.replace(re, replace as never);
  }
  return out;
}

/** True when redaction would change the text, i.e. something secret-shaped was present. */
export function containsSecretShape(text: string): boolean {
  return redactSecrets(text) !== text;
}
