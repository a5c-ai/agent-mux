/**
 * HarnessProbe — probes real harness installations to capture behavior profiles.
 *
 * Used by the CI pipeline to periodically compare mock fidelity against
 * real harness behavior. Runs the actual CLI tools with controlled inputs
 * and records output format, timing, exit codes, etc.
 */

import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { HarnessType, HarnessBehaviorProfile } from './types.js';

// ---------------------------------------------------------------------------
// Probe configuration
// ---------------------------------------------------------------------------

export interface ProbeConfig {
  /** The harness to probe. */
  harness: HarnessType;

  /** Command to invoke (e.g., 'claude', 'codex'). */
  command: string;

  /** Arguments for a simple probe run. */
  args?: string[];

  /** Environment overrides for the probe. */
  env?: Record<string, string>;

  /** Timeout for each probe run (ms). */
  timeoutMs?: number;

  /** Working directory for the probe. */
  cwd?: string;
}

/** Pre-configured probe configurations for known harnesses. */
export const PROBE_CONFIGS: Record<string, ProbeConfig> = {
  'claude-code': {
    harness: 'claude-code',
    command: 'claude',
    args: ['-p', 'Say hello in one word', '--output-format', 'json'],
    timeoutMs: 30000,
  },
  'codex': {
    harness: 'codex',
    command: 'codex',
    args: ['-q', 'Say hello in one word'],
    timeoutMs: 30000,
  },
};

// ---------------------------------------------------------------------------
// Probe result
// ---------------------------------------------------------------------------

export interface ProbeResult {
  /** Whether the probe succeeded. */
  success: boolean;

  /** Error message if the probe failed. */
  error?: string;

  /** The captured behavior profile. */
  profile?: HarnessBehaviorProfile;

  /** Raw stdout from the probe. */
  stdout?: string;

  /** Raw stderr from the probe. */
  stderr?: string;

  /** Exit code from the probe. */
  exitCode?: number;

  /** Wall-clock duration of the probe (ms). */
  durationMs?: number;
}

// ---------------------------------------------------------------------------
// Probing logic
// ---------------------------------------------------------------------------

/**
 * Probe a real harness installation and capture its behavior profile.
 */
export async function probeHarness(config: ProbeConfig): Promise<ProbeResult> {
  const startTime = Date.now();
  const cwd = config.cwd ?? os.tmpdir();
  const timeout = config.timeoutMs ?? 30000;

  return new Promise((resolve) => {
    const child = execFile(
      config.command,
      config.args ?? [],
      {
        cwd,
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        env: { ...process.env, ...config.env },
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - startTime;
        const exitCode = error?.code !== undefined
          ? (typeof error.code === 'number' ? error.code : 1)
          : 0;

        if (error && !stdout && !stderr) {
          resolve({
            success: false,
            error: error.message,
            durationMs,
            exitCode: typeof exitCode === 'number' ? exitCode : 1,
          });
          return;
        }

        const profile = buildProfile(config, stdout, stderr, durationMs);
        resolve({
          success: true,
          profile,
          stdout,
          stderr,
          exitCode: typeof exitCode === 'number' ? exitCode : 0,
          durationMs,
        });
      },
    );

    // Safety: kill if timeout is exceeded (execFile should handle this, but belt-and-suspenders)
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }, timeout + 5000);
  });
}

/**
 * Probe all configured harnesses and save profiles to a directory.
 */
export async function probeAllHarnesses(
  outputDir: string,
  configs?: Record<string, ProbeConfig>,
): Promise<Map<string, ProbeResult>> {
  const results = new Map<string, ProbeResult>();
  const allConfigs = configs ?? PROBE_CONFIGS;

  fs.mkdirSync(outputDir, { recursive: true });

  for (const [name, config] of Object.entries(allConfigs)) {
    const result = await probeHarness(config);
    results.set(name, result);

    if (result.profile) {
      const profilePath = path.join(outputDir, `${name}.profile.json`);
      fs.writeFileSync(profilePath, JSON.stringify(result.profile, null, 2), 'utf-8');
    }

    const resultPath = path.join(outputDir, `${name}.result.json`);
    fs.writeFileSync(resultPath, JSON.stringify({
      success: result.success,
      error: result.error,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      stdoutLength: result.stdout?.length ?? 0,
      stderrLength: result.stderr?.length ?? 0,
    }, null, 2), 'utf-8');
  }

  return results;
}

/**
 * Compare a behavior profile against a previous baseline.
 * Returns a list of differences.
 */
export function compareProfiles(
  baseline: HarnessBehaviorProfile,
  current: HarnessBehaviorProfile,
): ProfileDiff[] {
  const diffs: ProfileDiff[] = [];

  if (baseline.version !== current.version) {
    diffs.push({ field: 'version', baseline: baseline.version, current: current.version, severity: 'info' });
  }
  if (baseline.outputFormat !== current.outputFormat) {
    diffs.push({ field: 'outputFormat', baseline: baseline.outputFormat, current: current.outputFormat, severity: 'breaking' });
  }
  if (baseline.supportsStdin !== current.supportsStdin) {
    diffs.push({ field: 'supportsStdin', baseline: baseline.supportsStdin, current: current.supportsStdin, severity: 'breaking' });
  }

  // Check exit code changes
  for (const [scenario, code] of Object.entries(baseline.exitCodes)) {
    if (current.exitCodes[scenario] !== undefined && current.exitCodes[scenario] !== code) {
      diffs.push({ field: `exitCodes.${scenario}`, baseline: code, current: current.exitCodes[scenario], severity: 'warning' });
    }
  }

  // Check CLI pattern changes
  for (const [key, pattern] of Object.entries(baseline.cliPatterns)) {
    if (current.cliPatterns[key] !== undefined && current.cliPatterns[key] !== pattern) {
      diffs.push({ field: `cliPatterns.${key}`, baseline: pattern, current: current.cliPatterns[key], severity: 'breaking' });
    }
  }

  // Check startup time drift (>2x is a warning)
  if (current.startupTimeMs > baseline.startupTimeMs * 2) {
    diffs.push({ field: 'startupTimeMs', baseline: baseline.startupTimeMs, current: current.startupTimeMs, severity: 'warning' });
  }

  return diffs;
}

export interface ProfileDiff {
  field: string;
  baseline: unknown;
  current: unknown;
  severity: 'info' | 'warning' | 'breaking';
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildProfile(
  config: ProbeConfig,
  stdout: string,
  stderr: string,
  durationMs: number,
): HarnessBehaviorProfile {
  // Detect output format
  let outputFormat = 'text';
  const firstLine = stdout.split('\n')[0]?.trim() ?? '';
  if (firstLine.startsWith('{')) {
    try {
      JSON.parse(firstLine);
      outputFormat = 'jsonl';
    } catch {
      outputFormat = 'text';
    }
  }

  // Detect stdin support from stderr cues
  const supportsStdin = stderr.includes('(y/n)') || stderr.includes('stdin') || stderr.includes('interactive');

  return {
    harness: config.harness,
    version: 'unknown', // Would need --version probe
    capturedAt: new Date().toISOString(),
    startupTimeMs: Math.min(durationMs, 5000), // First output would be more precise
    outputFormat,
    supportsStdin,
    fileOperationPatterns: [],
    exitCodes: { 'probe-hello': 0 },
    environmentVariables: [],
    cliPatterns: {
      command: config.command,
      args: (config.args ?? []).join(' '),
    },
  };
}
