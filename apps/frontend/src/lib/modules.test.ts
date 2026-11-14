import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as client from '@/lib/api/client';
import * as env from '@/lib/config/env';
import * as dataSource from '@/lib/data/dataSource';

/**
 * Guards the exact failure behind the PR #1 review: modules under src/lib/ existed locally but were never
 * committed (a root .gitignore `lib/` rule hid them). These tests fail if a required module/export is
 * missing, and the ignore test fails if a git rule ever hides src/lib again.
 */
describe('required src/lib modules and exports', () => {
  it('api/client exposes every typed request function', () => {
    for (const name of [
      'getHealth',
      'getAssets',
      'getFindings',
      'getSecurityGraph',
      'getAttackPaths',
      'getRemediations',
      'approveRemediation',
      'resetDemo',
      'isDemoResetResponse',
      'ApiError',
      'ENDPOINTS',
    ] as const) {
      expect(client[name], `client.${name}`).toBeDefined();
    }
  });

  it('config/env exposes the base URL, data-source and timing helpers', () => {
    for (const name of [
      'getApiBaseUrl',
      'getDefaultDataSourceMode',
      'parseDataSourceMode',
      'DATA_SOURCE_STORAGE_KEY',
      'HEALTH_POLL_INTERVAL_MS',
      'REQUEST_TIMEOUT_MS',
      'DEFAULT_API_BASE_URL',
    ] as const) {
      expect(env[name], `env.${name}`).toBeDefined();
    }
  });

  it('data/dataSource exposes both sources and the selector', () => {
    expect(dataSource.apiDataSource.origin).toBe('BACKEND_API');
    expect(dataSource.previewDataSource.origin).toBe('SIMULATED_DEMO');
    expect(dataSource.getDataSource('api')).toBe(dataSource.apiDataSource);
    expect(dataSource.getDataSource('preview')).toBe(dataSource.previewDataSource);
  });
});

describe('API base URL', () => {
  it('defaults to the OpenAPI server URL', () => {
    expect(env.DEFAULT_API_BASE_URL).toBe('http://localhost:8000/api/v1');
    expect(env.getApiBaseUrl()).toBe('http://localhost:8000/api/v1');
  });

  it('parses only the two valid data-source modes', () => {
    expect(env.parseDataSourceMode('preview')).toBe('preview');
    expect(env.parseDataSourceMode('api')).toBe('api');
    expect(env.parseDataSourceMode('live')).toBeNull();
    expect(env.parseDataSourceMode(undefined)).toBeNull();
  });

  it('defaults to local preview when nothing is configured', () => {
    expect(env.getDefaultDataSourceMode()).toBe('preview');
  });
});

/**
 * Import-resolution guard against GIT'S INDEX, not the working directory.
 *
 * Two real failures reached PR #1 because a Windows working tree is case-insensitive and hides them:
 *  1. src/lib/ was never committed (root .gitignore `lib/` rule).
 *  2. components/ui/button.tsx was tracked lowercase while code imported `Button` (git core.ignorecase).
 * Both build fine locally and break on a clean or case-sensitive (Linux/CI) checkout. Checking the set of
 * tracked, exact-case paths catches both.
 */
describe('every source import resolves to a TRACKED file with exact case', () => {
  const frontendRoot = resolve(__dirname, '../..');

  function trackedSources(): Set<string> | null {
    try {
      const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'src'], {
        cwd: frontendRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return new Set(out.split(/\r?\n/).filter(Boolean));
    } catch {
      return null; // git unavailable (e.g. an exported tarball): skip rather than fake a pass
    }
  }

  it('has no import that is untracked, ignored, or differs only in letter case', (ctx) => {
    const files = trackedSources();
    if (!files) return ctx.skip();
    const resolves = (base: string) =>
      ['.ts', '.tsx', '/index.ts', '/index.tsx'].some((ext) => files.has(base + ext)) || files.has(base);

    const problems: string[] = [];
    for (const file of files) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      const text = readFileSync(resolve(frontendRoot, file), 'utf8');
      for (const match of text.matchAll(/from\s+'(@\/[^']+|\.{1,2}\/[^']+)'/g)) {
        const spec = match[1];
        if (/\.(css|svg|png)$/.test(spec)) continue;
        const base = posix.normalize(spec.startsWith('@/') ? `src/${spec.slice(2)}` : posix.join(posix.dirname(file), spec));
        if (!resolves(base)) problems.push(`${file} -> ${spec}`);
      }
    }
    expect(problems).toEqual([]);
  });
});
