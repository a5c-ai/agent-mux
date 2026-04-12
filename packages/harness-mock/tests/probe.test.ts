import { describe, it, expect } from 'vitest';
import { compareProfiles, PROBE_CONFIGS } from '../src/index.js';
import type { HarnessBehaviorProfile } from '../src/index.js';

function makeProfile(overrides?: Partial<HarnessBehaviorProfile>): HarnessBehaviorProfile {
  return {
    harness: 'claude-code',
    version: '1.0.0',
    capturedAt: '2026-01-01T00:00:00Z',
    startupTimeMs: 500,
    outputFormat: 'jsonl',
    supportsStdin: true,
    fileOperationPatterns: [],
    exitCodes: { 'probe-hello': 0 },
    environmentVariables: [],
    cliPatterns: { command: 'claude', args: '-p hello' },
    ...overrides,
  };
}

describe('compareProfiles', () => {
  it('returns empty diffs for identical profiles', () => {
    const p = makeProfile();
    expect(compareProfiles(p, p)).toEqual([]);
  });

  it('detects version change as info', () => {
    const base = makeProfile({ version: '1.0.0' });
    const curr = makeProfile({ version: '2.0.0' });
    const diffs = compareProfiles(base, curr);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]!.field).toBe('version');
    expect(diffs[0]!.severity).toBe('info');
  });

  it('detects output format change as breaking', () => {
    const base = makeProfile({ outputFormat: 'jsonl' });
    const curr = makeProfile({ outputFormat: 'text' });
    const diffs = compareProfiles(base, curr);
    expect(diffs.some(d => d.field === 'outputFormat' && d.severity === 'breaking')).toBe(true);
  });

  it('detects stdin support change as breaking', () => {
    const base = makeProfile({ supportsStdin: true });
    const curr = makeProfile({ supportsStdin: false });
    const diffs = compareProfiles(base, curr);
    expect(diffs.some(d => d.field === 'supportsStdin' && d.severity === 'breaking')).toBe(true);
  });

  it('detects exit code change as warning', () => {
    const base = makeProfile({ exitCodes: { 'probe-hello': 0 } });
    const curr = makeProfile({ exitCodes: { 'probe-hello': 1 } });
    const diffs = compareProfiles(base, curr);
    expect(diffs.some(d => d.field.startsWith('exitCodes') && d.severity === 'warning')).toBe(true);
  });

  it('detects startup time regression as warning', () => {
    const base = makeProfile({ startupTimeMs: 500 });
    const curr = makeProfile({ startupTimeMs: 1500 }); // 3x slower
    const diffs = compareProfiles(base, curr);
    expect(diffs.some(d => d.field === 'startupTimeMs' && d.severity === 'warning')).toBe(true);
  });

  it('ignores minor startup time changes', () => {
    const base = makeProfile({ startupTimeMs: 500 });
    const curr = makeProfile({ startupTimeMs: 800 }); // 1.6x — under 2x threshold
    const diffs = compareProfiles(base, curr);
    expect(diffs.some(d => d.field === 'startupTimeMs')).toBe(false);
  });
});

describe('PROBE_CONFIGS', () => {
  it('has claude-code config', () => {
    expect(PROBE_CONFIGS['claude-code']).toBeDefined();
    expect(PROBE_CONFIGS['claude-code']!.command).toBe('claude');
  });

  it('has codex config', () => {
    expect(PROBE_CONFIGS['codex']).toBeDefined();
    expect(PROBE_CONFIGS['codex']!.command).toBe('codex');
  });
});
