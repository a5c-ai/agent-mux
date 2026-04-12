/**
 * Types for the harness mock/simulator.
 *
 * A "harness" is a CLI tool (claude-code, codex, etc.) that agent-mux
 * invokes as a subprocess. This package simulates harness behavior for
 * testing without requiring the real CLI tools to be installed.
 */

import type { ErrorCode } from '@a5c-ai/agent-mux-core';

// ---------------------------------------------------------------------------
// Harness identity
// ---------------------------------------------------------------------------

/** Supported harness types for mocking. */
export type HarnessType =
  | 'claude-code'
  | 'codex'
  | 'gemini'
  | 'copilot'
  | 'cursor'
  | 'opencode'
  | 'pi'
  | 'omp'
  | 'openclaw'
  | 'hermes'
  | 'aider'
  | 'goose'
  | 'custom';

// ---------------------------------------------------------------------------
// File operation simulation
// ---------------------------------------------------------------------------

/** A simulated file operation that the harness would perform. */
export interface FileOperation {
  /** Type of file operation. */
  type: 'create' | 'modify' | 'delete' | 'rename';

  /** Absolute path to the file. */
  path: string;

  /** New path (only for 'rename'). */
  newPath?: string;

  /** Content to write (for 'create' and 'modify'). */
  content?: string;

  /** Diff/patch content (for 'modify', alternative to full content). */
  patch?: string;
}

// ---------------------------------------------------------------------------
// Process behavior simulation
// ---------------------------------------------------------------------------

/** Simulated process exit behavior. */
export interface ProcessBehavior {
  /** Exit code. 0 = success. */
  exitCode: number;

  /** Delay in ms before the process "starts producing output". */
  startupDelayMs?: number;

  /** Delay in ms before the process exits after all output is sent. */
  shutdownDelayMs?: number;

  /** If set, the process will crash with this signal after the given delay. */
  crashAfterMs?: number;

  /** Signal to crash with (default: SIGTERM). */
  crashSignal?: string;

  /** Whether the process hangs indefinitely (for timeout testing). */
  hang?: boolean;
}

// ---------------------------------------------------------------------------
// Stdin/Stdout simulation
// ---------------------------------------------------------------------------

/** A single output chunk from the simulated harness. */
export interface OutputChunk {
  /** Which stream this goes to. */
  stream: 'stdout' | 'stderr';

  /** The data to emit. */
  data: string;

  /** Delay in ms before emitting this chunk (relative to previous chunk). */
  delayMs?: number;
}

/** An expected stdin prompt and the mock's response behavior. */
export interface StdinInteraction {
  /** Pattern to match on stdout before this interaction fires. */
  triggerPattern: string | RegExp;

  /** Response to write to stdin. */
  response: string;

  /** Delay before responding (ms). */
  delayMs?: number;
}

// ---------------------------------------------------------------------------
// Event simulation
// ---------------------------------------------------------------------------

/** A simulated agent event (matching the agent-mux event schema). */
export interface MockEvent {
  /** Event type matching the agent-mux event taxonomy. */
  type: string;

  /** Delay before emitting this event (ms, relative to previous). */
  delayMs?: number;

  /** Event payload. */
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Harness scenario
// ---------------------------------------------------------------------------

/**
 * A complete scenario describing how a mock harness should behave.
 * This is the primary configuration object for setting up mock tests.
 */
export interface HarnessScenario {
  /** Which harness to simulate. */
  harness: HarnessType;

  /** Human-readable scenario name (for test output). */
  name?: string;

  /** Process behavior (exit code, timing, crashes). */
  process: ProcessBehavior;

  /** Sequence of output chunks to emit. */
  output: OutputChunk[];

  /** Sequence of events the harness would produce. */
  events?: MockEvent[];

  /** File operations the harness would perform. */
  fileOperations?: FileOperation[];

  /** Interactive stdin/stdout exchanges. */
  interactions?: StdinInteraction[];

  /** Environment variables the harness expects. */
  expectedEnv?: Record<string, string>;

  /** Expected command-line arguments. */
  expectedArgs?: string[];

  /** Expected working directory. */
  expectedCwd?: string;
}

// ---------------------------------------------------------------------------
// Mock harness handle
// ---------------------------------------------------------------------------

/** Handle to a running mock harness process. */
export interface MockHarnessHandle {
  /** The scenario being executed. */
  readonly scenario: HarnessScenario;

  /** PID-like identifier for this mock process. */
  readonly pid: number;

  /** Whether the process has exited. */
  readonly exited: boolean;

  /** The exit code (undefined until exited). */
  readonly exitCode: number | undefined;

  /** All stdout data collected so far. */
  readonly stdout: string;

  /** All stderr data collected so far. */
  readonly stderr: string;

  /** Files that were "modified" by this mock. */
  readonly fileChanges: FileOperation[];

  /** Write to the mock's stdin. */
  write(data: string): void;

  /** Send a signal to the mock process. */
  kill(signal?: string): void;

  /** Wait for the mock process to exit. */
  waitForExit(): Promise<{ exitCode: number; stdout: string; stderr: string }>;
}

// ---------------------------------------------------------------------------
// Harness behavior profile
// ---------------------------------------------------------------------------

/**
 * A captured behavior profile from probing a real harness.
 * Used to compare mock fidelity against actual harness behavior.
 */
export interface HarnessBehaviorProfile {
  /** Harness type. */
  harness: HarnessType;

  /** Version of the harness that was probed. */
  version: string;

  /** Timestamp of when the profile was captured. */
  capturedAt: string;

  /** Startup time in ms. */
  startupTimeMs: number;

  /** How the harness formats its output (jsonl, streaming text, etc). */
  outputFormat: string;

  /** Whether the harness supports stdin interaction. */
  supportsStdin: boolean;

  /** File operation patterns observed. */
  fileOperationPatterns: string[];

  /** Exit code mapping: scenario → exit code. */
  exitCodes: Record<string, number>;

  /** Environment variables the harness reads. */
  environmentVariables: string[];

  /** CLI argument patterns. */
  cliPatterns: Record<string, string>;
}
