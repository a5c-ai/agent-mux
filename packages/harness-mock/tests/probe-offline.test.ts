import { describe, it, expect } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { probeHarness, probeAllHarnesses, compareProfiles, PROBE_CONFIGS } from '../src/probe.js';
import type { ProbeConfig } from '../src/probe.js';
import type { HarnessBehaviorProfile } from '../src/types.js';

describe('HarnessProbe (offline)', () => {
  it('returns a failure result when the probed command does not exist', async () => {
    const config: ProbeConfig = {
      harness: 'claude-code',
      command: 'this-command-does-not-exist-12345',
      args: ['--version'],
      timeoutMs: 5000,
    };
    const result = await probeHarness(config);
    expect(result.success).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(result.exitCode).toBeDefined();
  });

  it('returns a profile when probing a real cross-platform command', async () => {
    // `node --version` is guaranteed to exist in this environment.
    const config: ProbeConfig = {
      harness: 'claude-code',
      command: process.execPath,
      args: ['--version'],
      timeoutMs: 5000,
    };
    const result = await probeHarness(config);
    expect(result.success).toBe(true);
    expect(result.profile).toBeTruthy();
    expect(result.stdout).toMatch(/v\d+/);
  });

  it('probeAllHarnesses writes result files and does not crash when commands are missing', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'amux-probe-'));
    const configs: Record<string, ProbeConfig> = {
      'missing-one': {
        harness: 'claude-code',
        command: 'absolutely-not-a-real-binary-xyz',
        args: [],
        timeoutMs: 2000,
      },
    };
    const results = await probeAllHarnesses(outDir, configs);
    expect(results.size).toBe(1);
    expect(results.get('missing-one')?.success).toBe(false);
    expect(fs.existsSync(path.join(outDir, 'missing-one.result.json'))).toBe(true);
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  it('PROBE_CONFIGS contains configured entries for known harnesses', () => {
    expect(PROBE_CONFIGS['claude-code']).toBeDefined();
    expect(PROBE_CONFIGS['codex']).toBeDefined();
  });

  it('compareProfiles detects breaking outputFormat changes', () => {
    const baseline: HarnessBehaviorProfile = {
      harness: 'claude-code',
      version: '1.0.0',
      capturedAt: new Date().toISOString(),
      startupTimeMs: 100,
      outputFormat: 'jsonl',
      supportsStdin: true,
      fileOperationPatterns: [],
      exitCodes: {},
      environmentVariables: [],
      cliPatterns: {},
    };
    const current: HarnessBehaviorProfile = { ...baseline, outputFormat: 'text' };
    const diffs = compareProfiles(baseline, current);
    expect(diffs.some((d) => d.field === 'outputFormat' && d.severity === 'breaking')).toBe(true);
  });
});
