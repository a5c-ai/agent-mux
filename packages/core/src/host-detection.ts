/**
 * Host-harness detection.
 *
 * Detects whether the current process is itself running *under* one of the
 * supported harnesses (as a child of that harness process). Useful for tools
 * like `amux` to distinguish "invoked from a shell" vs "invoked from Claude
 * Code / Codex / ... as a subprocess".
 *
 * Detection is synchronous and purely environmental — it does not spawn
 * subprocesses or read files. Signals come from:
 *  - env vars set by the enclosing harness
 *  - argv patterns (best-effort)
 *  - ppid heuristics when available
 *
 * Adapters contribute their known env signals via `hostEnvSignals`. A default
 * catalog is embedded here for when the adapters package is not loaded.
 */

import type { AgentName } from './types.js';

/** Information about a detected host harness. */
export interface HostHarnessInfo {
  /** The harness the current process is running under. */
  agent: AgentName;
  /** Confidence in the detection. */
  confidence: 'high' | 'medium' | 'low';
  /** Which signal was strongest. */
  source: 'env' | 'ppid' | 'argv';
  /** The concrete matched signals, for diagnostics. */
  matchedSignals: string[];
  /** Adapter-contributed metadata extracted from the host environment. */
  metadata?: Record<string, string | number | boolean | null>;
}

/** Map from agent name -> env var names that indicate that harness is the parent. */
export type HostSignalMap = Readonly<Record<string, readonly string[]>>;

/** Function signature for per-agent metadata extraction from env. */
export type HostMetadataReader = (
  env: NodeJS.ProcessEnv,
) => Record<string, string | number | boolean | null>;

/** Map from agent name -> metadata reader. Used by adapter contributions. */
export type HostMetadataMap = Readonly<Record<string, HostMetadataReader>>;

/** Default per-agent metadata extraction from common env vars. */
export const DEFAULT_HOST_METADATA: HostMetadataMap = {
  claude: (env) => ({
    session_id: env.CLAUDE_CODE_SESSION_ID ?? null,
    env_file: env.CLAUDE_ENV_FILE ?? null,
    project_dir: env.CLAUDE_PROJECT_DIR ?? null,
  }),
  codex: (env) => ({
    session_id: env.CODEX_SESSION_ID ?? null,
    run_id: env.CODEX_RUN_ID ?? null,
  }),
  gemini: (env) => ({
    session_id: env.GEMINI_SESSION_ID ?? null,
  }),
  copilot: (env) => ({
    session_id: env.COPILOT_CLI_SESSION ?? env.GH_COPILOT_SESSION ?? null,
  }),
  cursor: (env) => ({
    session_id: env.CURSOR_SESSION ?? env.CURSOR_AGENT_SESSION ?? null,
  }),
  opencode: (env) => ({
    session_id: env.OPENCODE_SESSION ?? null,
    run_id: env.OPENCODE_RUN_ID ?? null,
  }),
  pi: (env) => ({
    session_id: env.PI_SESSION_ID ?? null,
    run_id: env.PI_RUN_ID ?? null,
  }),
  omp: (env) => ({
    session_id: env.OMP_SESSION_ID ?? null,
    run_id: env.OMP_RUN_ID ?? null,
  }),
  openclaw: (env) => ({
    session_id: env.OPENCLAW_SESSION ?? null,
    run_id: env.OPENCLAW_RUN_ID ?? null,
  }),
  hermes: (env) => ({
    session_id: env.HERMES_SESSION ?? null,
    run_id: env.HERMES_RUN_ID ?? null,
  }),
};

/**
 * Default env-signal catalog for the ten built-in harnesses.
 *
 * These are typical env vars known to be set by each harness when it
 * spawns a child shell/subprocess. Extend via `detectHostHarness({ signals })`
 * for plugin adapters.
 */
export const DEFAULT_HOST_SIGNALS: HostSignalMap = {
  claude: ['CLAUDECODE', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE', 'CLAUDE_PROJECT_DIR'],
  codex: ['CODEX_SESSION_ID', 'CODEX_RUN_ID', 'CODEX_CLI'],
  gemini: ['GEMINI_CLI', 'GEMINI_SESSION_ID'],
  copilot: ['COPILOT_CLI_SESSION', 'GH_COPILOT_SESSION'],
  cursor: ['CURSOR_SESSION', 'CURSOR_AGENT_SESSION'],
  opencode: ['OPENCODE_SESSION', 'OPENCODE_RUN_ID'],
  pi: ['PI_RUN_ID', 'PI_SESSION_ID'],
  omp: ['OMP_RUN_ID', 'OMP_SESSION_ID'],
  openclaw: ['OPENCLAW_SESSION', 'OPENCLAW_RUN_ID'],
  hermes: ['HERMES_SESSION', 'HERMES_RUN_ID'],
};

/** Options for `detectHostHarness`. */
export interface DetectHostHarnessOptions {
  /** Override or extend the signal catalog. Merged over defaults. */
  signals?: HostSignalMap;
  /** Override or extend the metadata reader catalog. Merged over defaults. */
  metadata?: HostMetadataMap;
  /** Override process.env (for tests). */
  env?: NodeJS.ProcessEnv;
  /** Override process.argv (for tests). */
  argv?: readonly string[];
}

function extractMetadata(
  agent: string,
  env: NodeJS.ProcessEnv,
  readers: HostMetadataMap,
): Record<string, string | number | boolean | null> | undefined {
  const reader = readers[agent];
  if (!reader) return undefined;
  const meta = reader(env);
  // Drop null/undefined entries entirely to keep output clean.
  const out: Record<string, string | number | boolean | null> = {};
  let hasAny = false;
  for (const [k, v] of Object.entries(meta)) {
    if (v !== null && v !== undefined && v !== '') {
      out[k] = v;
      hasAny = true;
    }
  }
  return hasAny ? out : undefined;
}

/**
 * Detect whether the current process is running inside a supported harness.
 *
 * Returns `null` if no signals match. Confidence:
 *  - `high` if 2+ env signals for the same agent matched, or a single
 *    explicit `CLAUDECODE=1`-style flag in addition to other hints.
 *  - `medium` if exactly one env signal matched.
 *  - `low` if only argv heuristics matched.
 */
export function detectHostHarness(
  opts: DetectHostHarnessOptions = {},
): HostHarnessInfo | null {
  const env = opts.env ?? process.env;
  const argv = opts.argv ?? process.argv;
  const signals: HostSignalMap = {
    ...DEFAULT_HOST_SIGNALS,
    ...(opts.signals ?? {}),
  };
  const metadataReaders: HostMetadataMap = {
    ...DEFAULT_HOST_METADATA,
    ...(opts.metadata ?? {}),
  };

  // Score each agent by number of matched env signals.
  const matches = new Map<string, string[]>();
  for (const [agent, vars] of Object.entries(signals)) {
    const hit: string[] = [];
    for (const v of vars) {
      const val = env[v];
      if (val !== undefined && val !== '') hit.push(v);
    }
    if (hit.length > 0) matches.set(agent, hit);
  }

  if (matches.size > 0) {
    // Pick the agent with the most matched signals; stable on insertion order.
    let bestAgent: string | null = null;
    let bestHits: string[] = [];
    for (const [agent, hits] of matches) {
      if (hits.length > bestHits.length) {
        bestAgent = agent;
        bestHits = hits;
      }
    }
    if (bestAgent) {
      return {
        agent: bestAgent,
        confidence: bestHits.length >= 2 ? 'high' : 'medium',
        source: 'env',
        matchedSignals: bestHits,
        metadata: extractMetadata(bestAgent, env, metadataReaders),
      };
    }
  }

  // argv heuristic fallback (low confidence).
  const joined = argv.join(' ').toLowerCase();
  const argvPatterns: Array<{ agent: string; needle: string }> = [
    { agent: 'claude', needle: 'claude-code' },
    { agent: 'codex', needle: 'codex' },
    { agent: 'gemini', needle: 'gemini-cli' },
    { agent: 'copilot', needle: 'copilot' },
    { agent: 'cursor', needle: 'cursor-cli' },
    { agent: 'opencode', needle: 'opencode' },
  ];
  for (const { agent, needle } of argvPatterns) {
    if (joined.includes(` ${needle}`) || joined.includes(`/${needle}`) || joined.includes(`\\${needle}`)) {
      return {
        agent,
        confidence: 'low',
        source: 'argv',
        matchedSignals: [needle],
        metadata: extractMetadata(agent, env, metadataReaders),
      };
    }
  }

  return null;
}
