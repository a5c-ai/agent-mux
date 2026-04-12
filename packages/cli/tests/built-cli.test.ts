import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Smoke tests for the *built* CLI. These spawn `node packages/cli/dist/index.js`
 * to prove the published artifact actually runs end-to-end.
 *
 * The suite is skipped if `dist/index.js` does not exist (e.g. a fresh clone
 * that hasn't run `npm run build` yet), so `npm test` alone still passes.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const distEntry = resolve(__dirname, '..', 'dist', 'index.js');
const distExists = existsSync(distEntry);

const suite = distExists ? describe : describe.skip;

suite('built CLI (dist/index.js)', () => {
  it('--help prints usage and exits 0', () => {
    const res = spawnSync(process.execPath, [distEntry, '--help'], {
      encoding: 'utf8',
    });
    expect(res.status).toBe(0);
    const out = res.stdout + res.stderr;
    expect(out).toContain('amux');
    expect(out).toContain('Usage:');
  });

  it('--version prints a version string and exits 0', () => {
    const res = spawnSync(process.execPath, [distEntry, '--version'], {
      encoding: 'utf8',
    });
    expect(res.status).toBe(0);
    expect(res.stdout + res.stderr).toMatch(/amux\s+v\d+\.\d+\.\d+/);
  });

  it('adapters list exits 0 and contains all 11 built-in adapters', () => {
    const res = spawnSync(process.execPath, [distEntry, 'adapters', 'list', '--json'], {
      encoding: 'utf8',
    });
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(parsed).toHaveProperty('ok', true);
    expect(Array.isArray(parsed.data)).toBe(true);
    // Registration bootstrap must wire up all 11 built-in adapters.
    expect(parsed.data.length).toBeGreaterThanOrEqual(11);
    const agents = parsed.data.map((a: { agent: string }) => a.agent).sort();
    expect(agents).toEqual(expect.arrayContaining([
      'agent-mux-remote',
      'claude',
      'codex',
      'copilot',
      'cursor',
      'gemini',
      'hermes',
      'omp',
      'openclaw',
      'opencode',
      'pi',
    ]));
  });
});
