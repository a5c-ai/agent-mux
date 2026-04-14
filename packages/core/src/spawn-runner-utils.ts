import type { ChildProcess } from 'node:child_process';

import type { AgentAdapter, SpawnArgs } from './adapter.js';
import type { RetryPolicy } from './types.js';

export interface ActiveSpawn {
  child: ChildProcess;
  killTimer: NodeJS.Timeout | null;
}

export const isWindows = process.platform === 'win32';

export function computeDelay(policy: Required<RetryPolicy>, attempt: number): number {
  const exp = Math.min(policy.maxDelayMs, policy.baseDelayMs * Math.pow(2, attempt - 1));
  const jitter = exp * policy.jitterFactor * Math.random();
  return Math.floor(exp + jitter);
}

export async function resolveSpawnArgs(
  adapter: AgentAdapter,
  spawnArgs: SpawnArgs,
): Promise<SpawnArgs> {
  if (
    spawnArgs.shell === true ||
    spawnArgs.command !== adapter.cliCommand ||
    typeof adapter.detectInstallation !== 'function'
  ) {
    return spawnArgs;
  }

  const installation = await adapter.detectInstallation().catch(() => null);
  if (!installation?.installed || !installation.path) {
    return spawnArgs;
  }

  return {
    ...spawnArgs,
    command: installation.path,
  };
}
