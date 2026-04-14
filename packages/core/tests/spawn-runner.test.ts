import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

class FakeChild extends EventEmitter {
  stdout = new PassThrough();
  stderr = new PassThrough();
  stdin = {
    destroyed: false,
    write: vi.fn(),
    end: vi.fn(),
  };
  kill = vi.fn();
  pid: number | undefined = undefined;
}

const { spawnMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
}));

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
  return {
    ...actual,
    spawn: spawnMock,
  };
});

import { RunHandleImpl } from '../src/run-handle-impl.js';
import { startSpawnLoop } from '../src/spawn-runner.js';

describe('startSpawnLoop stdin transport', () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it('keeps stdin open for interactive runs and routes follow-up send() calls', async () => {
    const child = new FakeChild();
    spawnMock.mockReturnValue(child);

    const handle = new RunHandleImpl({ runId: 'run-1', agent: 'gemini' });
    const adapter = {
      agent: 'gemini',
      capabilities: { supportsStdinInjection: true },
      buildSpawnArgs: () => ({
        command: 'fake-agent',
        args: [],
        env: {},
        cwd: process.cwd(),
        usePty: false,
        stdin: 'first prompt\n',
      }),
      parseEvent: () => null,
    } as any;

    startSpawnLoop(handle, adapter, { agent: 'gemini', prompt: 'first prompt' } as any);
    await Promise.resolve();
    await Promise.resolve();

    expect(child.stdin.write).toHaveBeenCalledWith('first prompt\n');
    expect(child.stdin.end).not.toHaveBeenCalled();

    await handle.send('follow up');
    expect(child.stdin.write).toHaveBeenLastCalledWith('follow up\n');

    child.emit('exit', 0, null);
  });

  it('closes seeded stdin for explicit non-interactive runs', async () => {
    const child = new FakeChild();
    spawnMock.mockReturnValue(child);

    const handle = new RunHandleImpl({ runId: 'run-2', agent: 'gemini' });
    const adapter = {
      agent: 'gemini',
      capabilities: { supportsStdinInjection: true },
      buildSpawnArgs: () => ({
        command: 'fake-agent',
        args: [],
        env: {},
        cwd: process.cwd(),
        usePty: false,
        stdin: 'first prompt\n',
      }),
      parseEvent: () => null,
    } as any;

    startSpawnLoop(handle, adapter, { agent: 'gemini', prompt: 'first prompt', nonInteractive: true } as any);
    await Promise.resolve();
    await Promise.resolve();

    expect(child.stdin.write).toHaveBeenCalledWith('first prompt\n');
    expect(child.stdin.end).toHaveBeenCalledTimes(1);

    child.emit('exit', 0, null);
  });

  it('prefers detected executable path when spawning a bare cli command', async () => {
    const child = new FakeChild();
    spawnMock.mockReturnValue(child);

    const handle = new RunHandleImpl({ runId: 'run-3', agent: 'codex' });
    const adapter = {
      agent: 'codex',
      cliCommand: 'codex',
      capabilities: { supportsStdinInjection: false },
      detectInstallation: async () => ({
        installed: true,
        path: '/resolved/bin/codex',
      }),
      buildSpawnArgs: () => ({
        command: 'codex',
        args: ['exec'],
        env: {},
        cwd: process.cwd(),
        usePty: false,
      }),
      parseEvent: () => null,
    } as any;

    startSpawnLoop(handle, adapter, { agent: 'codex', prompt: 'go' } as any);
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(spawnMock).toHaveBeenCalledWith(
      '/resolved/bin/codex',
      ['exec'],
      expect.objectContaining({
        cwd: process.cwd(),
      }),
    );

    child.emit('exit', 0, null);
  });
});
