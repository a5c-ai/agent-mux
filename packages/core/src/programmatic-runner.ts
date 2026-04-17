import type { ProgrammaticAdapter } from './adapter-types.js';
import type { RunOptions } from './run-options.js';
import { AgentMuxError } from './errors.js';

import { RunHandleImpl } from './run-handle-impl.js';

export function startProgrammaticLoop(
  handle: RunHandleImpl,
  adapter: ProgrammaticAdapter,
  options: RunOptions,
): void {
  queueMicrotask(() => {
    void runProgrammatic(handle, adapter, options);
  });
}

async function runProgrammatic(
  handle: RunHandleImpl,
  adapter: ProgrammaticAdapter,
  options: RunOptions,
): Promise<void> {
  let aborted = false;
  let runTimeout: NodeJS.Timeout | null = null;
  let inactivityTimeout: NodeJS.Timeout | null = null;

  const clearTimers = (): void => {
    if (runTimeout) clearTimeout(runTimeout);
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
  };

  const resetInactivity = (): void => {
    if (!options.inactivityTimeout || options.inactivityTimeout <= 0) return;
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => {
      aborted = true;
      void handle.abort();
    }, options.inactivityTimeout);
  };

  if (options.timeout && options.timeout > 0) {
    runTimeout = setTimeout(() => {
      aborted = true;
      void handle.abort();
    }, options.timeout);
  }

  handle.bindInputTransport(async () => {
    throw new AgentMuxError(
      'STDIN_NOT_AVAILABLE',
      `${adapter.agent} does not support live prompt injection in the current agent-mux transport`,
      false,
    );
  });

  const originalAbort = handle.abort.bind(handle);
  handle.abort = async () => {
    aborted = true;
    clearTimers();
    try {
      await originalAbort();
    } catch {
      // Ignore double-finalization races.
    }
  };

  try {
    handle.transitionTo('running');
  } catch {
    // Ignore if already transitioned.
  }

  try {
    resetInactivity();
    for await (const event of adapter.execute(options)) {
      resetInactivity();
      handle.emit(event);
    }
    clearTimers();
    handle.complete(aborted ? 'aborted' : 'completed', aborted ? 1 : 0, null);
  } catch (err) {
    clearTimers();
    handle.emit({
      type: 'error',
      runId: handle.runId,
      agent: handle.agent,
      timestamp: Date.now(),
      code: 'INTERNAL',
      message: err instanceof Error ? err.message : String(err),
      recoverable: false,
    });
    handle.complete(aborted ? 'aborted' : 'crashed', null, null);
  }
}
