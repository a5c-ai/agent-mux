/**
 * BaseAgentAdapter — abstract base class for agent adapters.
 *
 * Provides shared utilities and hook points with sensible defaults.
 * All built-in adapters extend this class.
 *
 * @see 05-adapter-system.md §4
 */

import { spawn } from 'node:child_process';
import * as os from 'node:os';

import type {
  AgentName,
  CostRecord,
  RetryPolicy,
  AgentCapabilities,
  ModelCapabilities,
  AgentConfig,
  AgentConfigSchema,
  AuthState,
  AuthSetupGuidance,
  Session,
  InstalledPlugin,
  PluginInstallOptions,
  PluginSearchOptions,
  PluginListing,
  SpawnArgs,
  ParseContext,
  AgentAdapter,
  RunOptions,
  AgentEvent,
  ErrorCode,
  DetectInstallationResult,
  InstallResult,
  AdapterInstallOptions,
  AdapterUpdateOptions,
  Spawner,
  InstallMethod,
} from '@a5c-ai/agent-mux-core';
import { StreamAssembler } from '@a5c-ai/agent-mux-core';
import { runInstall, runUpdate, type InstallContext } from './adapter-install.js';

/**
 * Default Spawner that runs the command via `child_process.spawn`, capturing
 * stdout/stderr. `shell: false`, `windowsHide: true`.
 */
export const defaultSpawner: Spawner = (command, args, options) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true,
      env: options?.env ? { ...process.env, ...options.env } : process.env,
      cwd: options?.cwd,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (c: string) => { stdout += c; });
    child.stderr?.on('data', (c: string) => { stderr += c; });
    child.on('error', (err) => reject(err));
    child.on('exit', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });

/**
 * Abstract base class for agent adapters. Provides shared utilities
 * and hook points with sensible defaults.
 */
export abstract class BaseAgentAdapter implements AgentAdapter {
  // ── Abstract members (must be implemented by subclasses) ──────────

  abstract readonly agent: AgentName;
  abstract readonly displayName: string;
  abstract readonly cliCommand: string;
  abstract readonly minVersion?: string;
  abstract readonly capabilities: AgentCapabilities;
  abstract readonly models: ModelCapabilities[];
  abstract readonly defaultModelId?: string;
  abstract readonly configSchema: AgentConfigSchema;

  abstract buildSpawnArgs(options: RunOptions): SpawnArgs;
  abstract parseEvent(line: string, context: ParseContext): AgentEvent | AgentEvent[] | null;
  abstract detectAuth(): Promise<AuthState>;
  abstract getAuthGuidance(): AuthSetupGuidance;
  abstract sessionDir(cwd?: string): string;
  abstract parseSessionFile(filePath: string): Promise<Session>;
  abstract listSessionFiles(cwd?: string): Promise<string[]>;
  abstract readConfig(cwd?: string): Promise<AgentConfig>;
  abstract writeConfig(config: Partial<AgentConfig>, cwd?: string): Promise<void>;

  // ── Optional plugin operations ────────────────────────────────────

  listPlugins?(): Promise<InstalledPlugin[]>;
  installPlugin?(pluginId: string, options?: PluginInstallOptions): Promise<InstalledPlugin>;
  uninstallPlugin?(pluginId: string): Promise<void>;
  searchPlugins?(query: string, options?: PluginSearchOptions): Promise<PluginListing[]>;

  // ── Protected stream assembler ────────────────────────────────────

  protected readonly streamAssembler = new StreamAssembler();

  // ── Injectable spawner for install/update/detect ──────────────────

  /** Subprocess runner used by install/update/detect. Swap for tests. */
  protected _spawner: Spawner = defaultSpawner;

  /** Replaces the internal Spawner (used by tests and CLI DI). */
  setSpawner(spawner: Spawner): void {
    this._spawner = spawner;
  }

  // ── detectInstallation ────────────────────────────────────────────

  /**
   * Locates the harness binary and queries its `--version`. Default
   * implementation uses `which`/`where` + `<cli> --version`.
   */
  async detectInstallation(): Promise<DetectInstallationResult> {
    const locator = process.platform === 'win32' ? 'where' : 'which';
    let binPath: string | undefined;
    try {
      const res = await this._spawner(locator, [this.cliCommand]);
      if (res.code === 0) {
        const first = res.stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0];
        if (first) binPath = first;
      }
    } catch {
      // not found
    }

    if (!binPath) {
      return { installed: false };
    }

    let version: string | undefined;
    try {
      const vres = await this._spawner(this.cliCommand, ['--version']);
      if (vres.code === 0) {
        version = this.parseVersionOutput(vres.stdout + '\n' + vres.stderr);
      }
    } catch {
      // ignore; still installed
    }

    const out: DetectInstallationResult = { installed: true, path: binPath };
    if (version) out.version = version;
    return out;
  }

  /**
   * Parses a `--version` output line. Default: first semver-like token.
   * Override to accommodate bespoke version formats.
   */
  protected parseVersionOutput(raw: string): string | undefined {
    const match = raw.match(/\d+\.\d+\.\d+(?:[\w.+-]*)?/);
    return match ? match[0] : undefined;
  }

  // ── install ────────────────────────────────────────────────────────

  /**
   * Picks an install method compatible with the current platform, runs it,
   * then re-detects. Honors `force` and `dryRun`.
   */
  private _installContext(): InstallContext {
    return {
      cliCommand: this.cliCommand,
      displayName: this.displayName,
      spawner: this._spawner,
      detectInstallation: () => this.detectInstallation(),
      pickInstallMethod: () => this.pickInstallMethod(),
      applyVersionToCommand: (m, v) => this.applyVersionToCommand(m, v),
      deriveUpdateCommand: (m) => this.deriveUpdateCommand(m),
    };
  }

  async install(opts: AdapterInstallOptions = {}): Promise<InstallResult> {
    return runInstall(this._installContext(), opts);
  }

  // ── update ────────────────────────────────────────────────────────

  /** Runs the update/upgrade variant of the install command. */
  async update(opts: AdapterUpdateOptions = {}): Promise<InstallResult> {
    return runUpdate(this._installContext(), opts);
  }

  // ── Helpers ───────────────────────────────────────────────────────

  /**
   * Picks the first InstallMethod compatible with the current platform,
   * preferring non-manual methods.
   */
  protected pickInstallMethod(): InstallMethod | undefined {
    const plat = os.platform();
    const methods = this.capabilities.installMethods ?? [];
    const compatible = methods.filter((m) => {
      if (m.platform === 'all') return true;
      if (m.platform === plat) return true;
      // brew is acceptable on darwin/linux; npm on all
      return false;
    });
    if (compatible.length === 0) return undefined;
    const rank = (t: string): number => {
      switch (t) {
        case 'npm': return 0;
        case 'brew': return plat === 'darwin' || plat === 'linux' ? 1 : 50;
        case 'gh-extension': return 2;
        case 'pip': return 3;
        case 'winget': return plat === 'win32' ? 2 : 50;
        case 'scoop': return plat === 'win32' ? 3 : 50;
        case 'nix': return 6;
        case 'curl': return 7;
        case 'manual': return 99;
        default: return 50;
      }
    };
    return [...compatible].sort((a, b) => rank(a.type) - rank(b.type))[0];
  }

  /**
   * Replace `<pkg>` tail with `<pkg>@<version>` for npm-typed methods.
   */
  protected applyVersionToCommand(method: InstallMethod, version?: string): string {
    if (!version) return method.command;
    if (method.type !== 'npm') return method.command;
    const parts = method.command.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return method.command;
    const last = parts[parts.length - 1]!;
    // Only apply version if not already version-pinned.
    if (/@\d/.test(last.replace(/^@[^@/]+\//, ''))) return method.command;
    parts[parts.length - 1] = `${last}@${version}`;
    return parts.join(' ');
  }

  /**
   * Derives an update command from an install method.
   */
  protected deriveUpdateCommand(method: InstallMethod): string | null {
    const parts = method.command.split(/\s+/).filter(Boolean);
    const pkg = parts[parts.length - 1];
    if (!pkg) return null;
    switch (method.type) {
      case 'npm':
        return `npm update -g ${pkg}`;
      case 'brew':
        return `brew upgrade ${pkg}`;
      case 'pip':
        return `pip install --upgrade ${pkg}`;
      case 'winget':
        return `winget upgrade ${pkg}`;
      case 'scoop':
        return `scoop update ${pkg}`;
      case 'curl':
        // Re-run the installer script.
        return method.command;
      case 'nix':
        return `nix-env -u ${pkg}`;
      case 'gh-extension':
        return `gh extension upgrade ${pkg}`;
      case 'manual':
        return null;
      default:
        return null;
    }
  }

  // ── Protected utilities ───────────────────────────────────────────

  /**
   * Attempts to parse a line as JSON. Returns the parsed value on success,
   * or null if the line is not valid JSON. Does not throw.
   */
  protected parseJsonLine(line: string): unknown | null {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }

  /**
   * Normalizes a raw cost/usage object from agent output into the
   * standard CostRecord type.
   */
  protected assembleCostRecord(raw: unknown): CostRecord | null {
    if (raw == null || typeof raw !== 'object') return null;

    const obj = raw as Record<string, unknown>;

    // Try common field names for total cost
    const totalUsd = extractNumber(obj, ['totalUsd', 'total_usd', 'cost', 'total_cost', 'totalCost']) ?? 0;
    const inputTokens = extractNumber(obj, ['inputTokens', 'input_tokens', 'prompt_tokens']) ?? 0;
    const outputTokens = extractNumber(obj, ['outputTokens', 'output_tokens', 'completion_tokens']) ?? 0;
    const thinkingTokens = extractNumber(obj, ['thinkingTokens', 'thinking_tokens', 'reasoning_tokens']);
    const cachedTokens = extractNumber(obj, ['cachedTokens', 'cached_tokens', 'cache_read_input_tokens']);

    // Must have at least some recognizable data
    if (totalUsd === 0 && inputTokens === 0 && outputTokens === 0) return null;

    const record: CostRecord = {
      totalUsd,
      inputTokens,
      outputTokens,
    };

    if (thinkingTokens != null) record.thinkingTokens = thinkingTokens;
    if (cachedTokens != null) record.cachedTokens = cachedTokens;

    return record;
  }

  /**
   * Detects the installed CLI version. Returns null in the base implementation.
   * Subclasses should override to run the agent's CLI with a version flag.
   */
  protected async detectVersionFromCli(): Promise<string | null> {
    return null;
  }

  /**
   * Builds the environment variable record for the subprocess from RunOptions.
   */
  protected buildEnvFromOptions(options: RunOptions): Record<string, string> {
    const env: Record<string, string> = {};

    // Merge RunOptions.env
    if (options.env) {
      Object.assign(env, options.env);
    }

    return env;
  }

  /**
   * Resolves the session ID to use for this run.
   */
  protected resolveSessionId(options: RunOptions): string | undefined {
    if (options.sessionId) return options.sessionId;
    if (options.forkSessionId) return options.forkSessionId;
    if (options.noSession) return undefined;
    return undefined;
  }

  // ── Hook points (overridable, with defaults) ──────────────────────

  /**
   * Called when the agent subprocess fails to spawn.
   */
  onSpawnError(error: Error): AgentEvent {
    return {
      type: 'crash',
      runId: '',
      agent: this.agent,
      timestamp: Date.now(),
      exitCode: -1,
      stderr: error.message,
    } as AgentEvent;
  }

  /**
   * Called when the inactivity timeout fires.
   */
  onTimeout(): AgentEvent {
    return {
      type: 'error',
      runId: '',
      agent: this.agent,
      timestamp: Date.now(),
      code: 'TIMEOUT' as ErrorCode,
      message: 'Inactivity timeout',
      recoverable: false,
    } as AgentEvent;
  }

  /**
   * Called when the agent subprocess exits.
   */
  onProcessExit(exitCode: number, signal: string | null): AgentEvent[] {
    if (exitCode === 0) return [];

    if (signal) {
      return [
        {
          type: 'error',
          runId: '',
          agent: this.agent,
          timestamp: Date.now(),
          code: 'AGENT_CRASH' as ErrorCode,
          message: `Process killed by signal: ${signal}`,
          recoverable: false,
        } as AgentEvent,
      ];
    }

    return [
      {
        type: 'crash',
        runId: '',
        agent: this.agent,
        timestamp: Date.now(),
        exitCode,
        stderr: '',
      } as AgentEvent,
    ];
  }

  /**
   * Determines whether a failed run should be retried.
   */
  shouldRetry(event: AgentEvent, attempt: number, policy: RetryPolicy): boolean {
    const maxAttempts = policy.maxAttempts ?? 3;
    if (attempt >= maxAttempts) return false;

    const retryOn = policy.retryOn ?? ['RATE_LIMITED', 'AGENT_CRASH', 'TIMEOUT'];

    // Check if the event has an error code
    if ('code' in event && typeof event.code === 'string') {
      return retryOn.includes(event.code as ErrorCode);
    }

    // Check if it's a crash event
    if (event.type === 'crash') {
      return retryOn.includes('AGENT_CRASH');
    }

    return false;
  }

  /**
   * Default hook installation: registers in .amux/hooks.json only.
   * Override in subclasses to also write native harness config (e.g.
   * ~/.claude/settings.json) so the hook fires without amux present.
   */
  async installHook(
    hookType: string,
    command: string,
    opts: { scope?: 'global' | 'project'; id?: string } = {},
  ): Promise<void> {
    await this.registerHookInConfig(hookType, command, opts);
    await this.writeNativeHook(hookType, command);
  }

  /** Register a hook in the unified .amux/hooks.json store. */
  protected async registerHookInConfig(
    hookType: string,
    command: string,
    opts: { scope?: 'global' | 'project'; id?: string } = {},
  ): Promise<void> {
    const { HookConfigManager } = await import('@a5c-ai/agent-mux-core');
    const mgr = new HookConfigManager();
    const id = opts.id ?? `${this.agent}.${hookType}.${Date.now().toString(36)}`;
    await mgr.add(
      {
        id,
        agent: this.agent,
        hookType,
        handler: 'command',
        target: command,
        enabled: true,
      },
      opts.scope ?? 'project',
    );
  }

  /**
   * Write the hook into the harness's native config. Default: append
   * `{ command }` to `hooks[hookType]` in configFilePaths[0] if it is
   * a .json file. Subclasses override to use harness-specific schema.
   * Best-effort: failures are swallowed so SDK registration still succeeds.
   */
  protected async writeNativeHook(hookType: string, command: string): Promise<void> {
    const nativePath = this.configSchema.configFilePaths?.[0];
    if (!nativePath || !nativePath.endsWith('.json')) return;
    try {
      await this.appendJsonHook(nativePath, hookType, { command });
    } catch {
      // swallow
    }
  }

  async uninstallHook(
    id: string,
    opts: { scope?: 'global' | 'project' } = {},
  ): Promise<boolean> {
    const { HookConfigManager } = await import('@a5c-ai/agent-mux-core');
    const mgr = new HookConfigManager();
    return await mgr.remove(id, opts.scope);
  }

  /**
   * Append `{ command }` to `hooks[hookType]` in the given JSON file,
   * preserving any existing hooks and creating the parent directory if
   * needed. Used by adapters that expose a simple JSON-based native
   * hook config (codex, gemini, copilot, cursor, opencode, pi, omp,
   * openclaw, hermes).
   */
  protected async appendJsonHook(
    settingsPath: string,
    hookType: string,
    entry: Record<string, unknown>,
  ): Promise<void> {
    const fsp = await import('node:fs/promises');
    const pathMod = await import('node:path');
    let doc: Record<string, unknown> = {};
    try {
      doc = JSON.parse(await fsp.readFile(settingsPath, 'utf8')) as Record<string, unknown>;
    } catch {
      doc = {};
    }
    const hooks = (doc['hooks'] && typeof doc['hooks'] === 'object'
      ? (doc['hooks'] as Record<string, unknown>)
      : {}) as Record<string, unknown>;
    const existing = Array.isArray(hooks[hookType])
      ? (hooks[hookType] as unknown[]).slice()
      : [];
    existing.push(entry);
    hooks[hookType] = existing;
    doc['hooks'] = hooks;
    await fsp.mkdir(pathMod.dirname(settingsPath), { recursive: true });
    await fsp.writeFile(settingsPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  }

}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractNumber(
  obj: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    // Check nested objects
    if (typeof val === 'object' && val !== null) {
      const nested = val as Record<string, unknown>;
      for (const nk of Object.keys(nested)) {
        const nv = nested[nk];
        if (typeof nv === 'number' && Number.isFinite(nv)) return nv;
      }
    }
  }
  return undefined;
}
