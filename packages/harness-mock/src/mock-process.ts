/**
 * MockProcess — simulates a harness subprocess with configurable behavior.
 *
 * Emits output chunks on a schedule, handles stdin interactions,
 * simulates file operations, and exits with the configured code/timing.
 */

import { EventEmitter } from 'node:events';
import type {
  HarnessScenario,
  MockHarnessHandle,
  OutputChunk,
  FileOperation,
  StdinInteraction,
} from './types.js';

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let nextPid = 10000;

// ---------------------------------------------------------------------------
// MockProcess
// ---------------------------------------------------------------------------

export class MockProcess extends EventEmitter implements MockHarnessHandle {
  readonly scenario: HarnessScenario;
  readonly pid: number;

  private _exited = false;
  private _exitCode: number | undefined;
  private _stdout = '';
  private _stderr = '';
  private _fileChanges: FileOperation[] = [];
  private _killed = false;
  private _timers: ReturnType<typeof setTimeout>[] = [];
  private _stdinBuffer = '';

  constructor(scenario: HarnessScenario) {
    super();
    this.scenario = scenario;
    this.pid = nextPid++;
  }

  // -----------------------------------------------------------------------
  // MockHarnessHandle
  // -----------------------------------------------------------------------

  get exited(): boolean { return this._exited; }
  get exitCode(): number | undefined { return this._exitCode; }
  get stdout(): string { return this._stdout; }
  get stderr(): string { return this._stderr; }
  get fileChanges(): FileOperation[] { return [...this._fileChanges]; }

  write(data: string): void {
    if (this._exited) throw new Error('Cannot write to exited process');
    this._stdinBuffer += data;
    this.emit('stdin', data);
  }

  kill(signal = 'SIGTERM'): void {
    if (this._exited) return;
    this._killed = true;
    this._cleanup();
    this._exit(signal === 'SIGKILL' ? 137 : 143);
  }

  waitForExit(): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    if (this._exited) {
      return Promise.resolve({
        exitCode: this._exitCode!,
        stdout: this._stdout,
        stderr: this._stderr,
      });
    }
    return new Promise((resolve) => {
      this.once('exit', () => {
        resolve({
          exitCode: this._exitCode!,
          stdout: this._stdout,
          stderr: this._stderr,
        });
      });
    });
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /**
   * Start the mock process. Call this after setting up event listeners.
   * Returns the handle for chaining.
   */
  start(): MockHarnessHandle {
    const startDelay = this.scenario.process.startupDelayMs ?? 0;

    this._schedule(startDelay, () => {
      this.emit('spawn');
      this._validateExpectations();
      this._emitOutputChunks();
      this._applyFileOperations();
      this._scheduleExit();
    });

    if (this.scenario.process.hang) {
      // Don't schedule exit — process hangs
      return this;
    }

    if (this.scenario.process.crashAfterMs !== undefined) {
      this._schedule(this.scenario.process.crashAfterMs, () => {
        if (!this._exited) {
          const signal = this.scenario.process.crashSignal ?? 'SIGTERM';
          this._exit(signal === 'SIGKILL' ? 137 : 143);
        }
      });
    }

    return this;
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private _emitOutputChunks(): void {
    let cumulativeDelay = 0;
    for (const chunk of this.scenario.output) {
      cumulativeDelay += (chunk.delayMs ?? 0);
      this._schedule(cumulativeDelay, () => {
        if (this._exited) return;
        if (chunk.stream === 'stdout') {
          this._stdout += chunk.data;
          this.emit('stdout', chunk.data);
        } else {
          this._stderr += chunk.data;
          this.emit('stderr', chunk.data);
        }
        this._checkInteractions(chunk);
      });
    }
  }

  private _applyFileOperations(): void {
    if (!this.scenario.fileOperations) return;
    let cumulativeDelay = 0;
    for (const op of this.scenario.fileOperations) {
      this._schedule(cumulativeDelay, () => {
        if (this._exited) return;
        this._fileChanges.push(op);
        this.emit('file-operation', op);
      });
    }
  }

  private _checkInteractions(chunk: OutputChunk): void {
    if (!this.scenario.interactions) return;
    for (const interaction of this.scenario.interactions) {
      const pattern = typeof interaction.triggerPattern === 'string'
        ? new RegExp(interaction.triggerPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        : interaction.triggerPattern;

      if (pattern.test(chunk.data)) {
        const delay = interaction.delayMs ?? 0;
        this._schedule(delay, () => {
          if (!this._exited) {
            this.emit('auto-response', interaction.response);
          }
        });
      }
    }
  }

  private _scheduleExit(): void {
    if (this.scenario.process.hang) return;
    if (this.scenario.process.crashAfterMs !== undefined) return;

    // Calculate total output time
    let totalOutputTime = 0;
    for (const chunk of this.scenario.output) {
      totalOutputTime += (chunk.delayMs ?? 0);
    }
    const shutdownDelay = this.scenario.process.shutdownDelayMs ?? 0;
    this._schedule(totalOutputTime + shutdownDelay, () => {
      if (!this._exited) {
        this._exit(this.scenario.process.exitCode);
      }
    });
  }

  private _validateExpectations(): void {
    // These are checked synchronously at start for test assertions
    if (this.scenario.expectedEnv) {
      this.emit('validate-env', this.scenario.expectedEnv);
    }
    if (this.scenario.expectedArgs) {
      this.emit('validate-args', this.scenario.expectedArgs);
    }
    if (this.scenario.expectedCwd) {
      this.emit('validate-cwd', this.scenario.expectedCwd);
    }
  }

  private _exit(code: number): void {
    if (this._exited) return;
    this._exited = true;
    this._exitCode = code;
    this._cleanup();
    this.emit('exit', code);
  }

  private _schedule(delayMs: number, fn: () => void): void {
    if (delayMs <= 0) {
      // Use setImmediate for zero-delay to maintain async semantics
      const timer = setTimeout(fn, 0);
      this._timers.push(timer);
    } else {
      const timer = setTimeout(fn, delayMs);
      this._timers.push(timer);
    }
  }

  private _cleanup(): void {
    for (const timer of this._timers) {
      clearTimeout(timer);
    }
    this._timers = [];
  }
}
