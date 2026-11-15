import { describe, expect, it } from 'vitest';
import { containsSecretShape, redactSecrets } from './redact';

// Every "secret" below is a synthetic, publicly documented example value or an obvious dummy.
describe('redactSecrets', () => {
  it('redacts a raw AWS access key id but keeps its kind visible', () => {
    const out = redactSecrets('AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE');
    expect(out).not.toContain('IOSFODNN7EXAMPLE');
    expect(out).toContain('AKIA****************');
  });

  it('redacts a literal secret assigned to a secret-named variable, quoted or not', () => {
    expect(redactSecrets('AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')).toBe('AWS_SECRET_ACCESS_KEY=****REDACTED****');
    expect(redactSecrets('password: "hunter2hunter2hunter2"')).toBe('password: "****REDACTED****"');
    expect(redactSecrets("api_key = 'abcdef1234567890abcdef'")).toBe("api_key = '****REDACTED****'");
  });

  it('redacts well-known token shapes', () => {
    expect(redactSecrets('t=ghp_' + 'a'.repeat(30))).not.toContain('a'.repeat(30));
    expect(redactSecrets('github_pat_' + 'B'.repeat(30))).not.toContain('B'.repeat(30));
    expect(redactSecrets('xoxb-1234567890-abcdefghij')).not.toContain('abcdefghij');
    expect(redactSecrets('sk-' + 'Z'.repeat(30))).not.toContain('Z'.repeat(30));
  });

  it('redacts a whole PEM private key block, body included, even if truncated', () => {
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA1234567890\nabcdefghijklmnop\n-----END RSA PRIVATE KEY-----';
    expect(redactSecrets(`x\n${pem}\ny`)).toBe('x\n[private key redacted]\ny');
    expect(redactSecrets('-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg')).toBe('[private key redacted]');
  });

  it('leaves already-masked values, variable references and placeholders untouched', () => {
    const safe = [
      'AWS_SECRET_ACCESS_KEY=wJal****************EKEY',
      'AWS_ACCESS_KEY_ID=AKIA****************MPLE',
      'AWS_SECRET_ACCESS_KEY=${SECRET_VAULT_AWS_KEY}',
      'Resource = "arn:aws:s3:::<scoped-staging-bucket>/*"',
      'token = <your-token-here-please>',
      'SECRET_KEY=***',
    ];
    for (const line of safe) expect(redactSecrets(line)).toBe(line);
  });

  it('does not redact ordinary words or short values', () => {
    for (const line of ['the secret is out', 'password = short', 'Action = ["s3:GetObject", "s3:PutObject"]', 'keyboard = qwertyuiopasdfghjkl']) {
      expect(redactSecrets(line)).toBe(line);
    }
  });

  it('is idempotent', () => {
    const once = redactSecrets('AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY AKIAIOSFODNN7EXAMPLE');
    expect(redactSecrets(once)).toBe(once);
  });

  it('handles empty input and preserves line structure', () => {
    expect(redactSecrets('')).toBe('');
    expect(redactSecrets('a\nb\n\nc')).toBe('a\nb\n\nc');
  });
});

describe('containsSecretShape', () => {
  it('flags raw secrets and clears masked ones', () => {
    expect(containsSecretShape('AKIAIOSFODNN7EXAMPLE')).toBe(true);
    expect(containsSecretShape('AKIA****************MPLE')).toBe(false);
    expect(containsSecretShape('nothing to see')).toBe(false);
  });
});
