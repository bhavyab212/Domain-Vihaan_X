import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
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

describe('every @/lib import resolves to a file on disk', () => {
  const srcRoot = resolve(__dirname, '..');

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return sourceFiles(full);
      return /\.(ts|tsx)$/.test(entry) ? [full] : [];
    });
  }

  it('has no dangling "@/lib/..." imports', () => {
    const missing: string[] = [];
    for (const file of sourceFiles(srcRoot)) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/from\s+'@\/(lib\/[^']+)'/g)) {
        const target = join(srcRoot, match[1]);
        const candidates = [`${target}.ts`, `${target}.tsx`, join(target, 'index.ts')];
        if (!candidates.some((c) => { try { return statSync(c).isFile(); } catch { return false; } })) {
          missing.push(`${file.replace(srcRoot, 'src')} -> @/${match[1]}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
