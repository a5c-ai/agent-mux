import { describe, it, expect, vi } from 'vitest';
import { MockProcess } from '../src/mock-process.js';
import type { HarnessScenario } from '../src/types.js';

function simpleScenario(overrides?: Partial<HarnessScenario>): HarnessScenario {
  return {
    harness: 'claude-code',
    process: { exitCode: 0 },
    output: [
      { stream: 'stdout', data: 'hello\n' },
    ],
    ...overrides,
  };
}

describe('MockProcess', () => {
  describe('basic lifecycle', () => {
    it('starts and exits with configured exit code', async () => {
      const proc = new MockProcess(simpleScenario());
      proc.start();
      const result = await proc.waitForExit();
      expect(result.exitCode).toBe(0);
      expect(proc.exited).toBe(true);
    });

    it('emits stdout data', async () => {
      const proc = new MockProcess(simpleScenario());
      const chunks: string[] = [];
      proc.on('stdout', (data: string) => chunks.push(data));
      proc.start();
      await proc.waitForExit();
      expect(chunks).toEqual(['hello\n']);
      expect(proc.stdout).toBe('hello\n');
    });

    it('emits stderr data', async () => {
      const proc = new MockProcess(simpleScenario({
        output: [{ stream: 'stderr', data: 'error\n' }],
      }));
      const chunks: string[] = [];
      proc.on('stderr', (data: string) => chunks.push(data));
      proc.start();
      await proc.waitForExit();
      expect(chunks).toEqual(['error\n']);
      expect(proc.stderr).toBe('error\n');
    });

    it('exits with non-zero code', async () => {
      const proc = new MockProcess(simpleScenario({
        process: { exitCode: 1 },
      }));
      proc.start();
      const result = await proc.waitForExit();
      expect(result.exitCode).toBe(1);
    });

    it('assigns unique PIDs', () => {
      const a = new MockProcess(simpleScenario());
      const b = new MockProcess(simpleScenario());
      expect(a.pid).not.toBe(b.pid);
    });
  });

  describe('kill', () => {
    it('can be killed with SIGTERM', async () => {
      const proc = new MockProcess(simpleScenario({
        process: { exitCode: 0, hang: true },
      }));
      proc.start();

      // Kill after a short delay
      setTimeout(() => proc.kill('SIGTERM'), 10);
      const result = await proc.waitForExit();
      expect(result.exitCode).toBe(143); // 128 + 15 (SIGTERM)
    });

    it('can be killed with SIGKILL', async () => {
      const proc = new MockProcess(simpleScenario({
        process: { exitCode: 0, hang: true },
      }));
      proc.start();
      setTimeout(() => proc.kill('SIGKILL'), 10);
      const result = await proc.waitForExit();
      expect(result.exitCode).toBe(137); // 128 + 9 (SIGKILL)
    });

    it('kill is idempotent', async () => {
      const proc = new MockProcess(simpleScenario({
        process: { exitCode: 0, hang: true },
      }));
      proc.start();
      setTimeout(() => {
        proc.kill();
        proc.kill(); // Second kill should be no-op
      }, 10);
      const result = await proc.waitForExit();
      expect(result.exitCode).toBe(143);
    });
  });

  describe('crash simulation', () => {
    it('crashes after configured delay', async () => {
      const proc = new MockProcess(simpleScenario({
        process: { exitCode: 0, crashAfterMs: 50, crashSignal: 'SIGTERM' },
        output: [],
      }));
      proc.start();
      const result = await proc.waitForExit();
      expect(result.exitCode).toBe(143);
    });
  });

  describe('stdin', () => {
    it('accepts stdin writes', async () => {
      const proc = new MockProcess(simpleScenario());
      proc.start();
      const stdinData: string[] = [];
      proc.on('stdin', (data: string) => stdinData.push(data));
      proc.write('input\n');
      await proc.waitForExit();
      expect(stdinData).toEqual(['input\n']);
    });

    it('throws when writing to exited process', async () => {
      const proc = new MockProcess(simpleScenario({ output: [] }));
      proc.start();
      await proc.waitForExit();
      expect(() => proc.write('late')).toThrow('Cannot write to exited process');
    });
  });

  describe('file operations', () => {
    it('tracks file operations', async () => {
      const proc = new MockProcess(simpleScenario({
        output: [],
        fileOperations: [
          { type: 'create', path: '/tmp/test.txt', content: 'hello' },
          { type: 'modify', path: '/tmp/existing.txt', content: 'updated' },
        ],
      }));
      proc.start();
      await proc.waitForExit();
      expect(proc.fileChanges).toHaveLength(2);
      expect(proc.fileChanges[0]!.type).toBe('create');
      expect(proc.fileChanges[1]!.type).toBe('modify');
    });

    it('emits file-operation events', async () => {
      const ops: unknown[] = [];
      const proc = new MockProcess(simpleScenario({
        output: [],
        fileOperations: [
          { type: 'create', path: '/tmp/test.txt', content: 'hello' },
        ],
      }));
      proc.on('file-operation', (op: unknown) => ops.push(op));
      proc.start();
      await proc.waitForExit();
      expect(ops).toHaveLength(1);
    });
  });

  describe('multiple output chunks', () => {
    it('emits chunks in order', async () => {
      const proc = new MockProcess(simpleScenario({
        output: [
          { stream: 'stdout', data: 'line1\n' },
          { stream: 'stdout', data: 'line2\n' },
          { stream: 'stderr', data: 'err\n' },
        ],
      }));
      const events: Array<{ stream: string; data: string }> = [];
      proc.on('stdout', (data: string) => events.push({ stream: 'stdout', data }));
      proc.on('stderr', (data: string) => events.push({ stream: 'stderr', data }));
      proc.start();
      await proc.waitForExit();
      expect(proc.stdout).toBe('line1\nline2\n');
      expect(proc.stderr).toBe('err\n');
    });
  });

  describe('waitForExit resolves immediately if already exited', () => {
    it('resolves immediately', async () => {
      const proc = new MockProcess(simpleScenario({ output: [] }));
      proc.start();
      await proc.waitForExit();
      // Second call should also resolve
      const result = await proc.waitForExit();
      expect(result.exitCode).toBe(0);
    });
  });
});
