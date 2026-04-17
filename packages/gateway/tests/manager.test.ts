import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { RunHandleImpl } from '@a5c-ai/agent-mux-core';
import { afterEach, describe, expect, it } from 'vitest';

import { RunManager, resolveGatewayConfig } from '../src/index.js';
import type { ClientConn } from '../src/fanout/client-conn.js';

interface FakeClientState {
  handle: RunHandleImpl;
  hooks?: Record<string, (...args: unknown[]) => Promise<unknown>>;
}

interface FakeRunClient {
  latest: FakeClientState | null;
  run(options: Record<string, unknown>): RunHandleImpl;
}

interface StubConn {
  id: string;
  subscriptions: Set<string>;
  frames: Array<Record<string, unknown>>;
  send(frame: Record<string, unknown>): void;
}

function createFakeRunClient(): FakeRunClient {
  return {
    latest: null,
    run(options) {
      const handle = new RunHandleImpl({
        runId: typeof options['runId'] === 'string' ? options['runId'] : '01TESTRUN000000000000000001',
        agent: String(options['agent']),
      });
      this.latest = {
        handle,
        hooks: options['hooks'] as FakeClientState['hooks'],
      };
      return handle;
    },
  };
}

function createStubConn(id: string): StubConn {
  return {
    id,
    subscriptions: new Set<string>(),
    frames: [],
    send(frame) {
      this.frames.push(frame);
    },
  };
}

describe('gateway run manager', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it('replays sinceSeq without gaps and transitions to live delivery', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gateway-manager-'));
    tempDirs.push(tempDir);
    const fakeClient = createFakeRunClient();
    const manager = new RunManager(
      resolveGatewayConfig({
        eventLogDir: tempDir,
        client: fakeClient,
      }),
      { debug() {}, info() {}, warn() {}, error() {} },
    );

    const run = await manager.start(
      {
        runId: '01TESTRUN000000000000000001',
        agent: 'claude',
        prompt: 'hello',
      },
      { tokenId: 'tok-1', name: 'browser' },
    );

    fakeClient.latest!.handle.emit({
      type: 'text_delta',
      runId: run.runId,
      agent: 'claude',
      timestamp: Date.now(),
      delta: 'a',
      accumulated: 'a',
    });
    fakeClient.latest!.handle.emit({
      type: 'text_delta',
      runId: run.runId,
      agent: 'claude',
      timestamp: Date.now(),
      delta: 'b',
      accumulated: 'ab',
    });
    await new Promise((resolve) => setTimeout(resolve, 25));

    const conn = createStubConn('left');
    await manager.subscribe(conn as unknown as ClientConn, run.runId, 1);

    fakeClient.latest!.handle.emit({
      type: 'message_stop',
      runId: run.runId,
      agent: 'claude',
      timestamp: Date.now(),
      text: 'done',
    });
    await new Promise((resolve) => setTimeout(resolve, 25));

    const runEvents = conn.frames.filter((frame) => frame['type'] === 'run.event');
    expect(runEvents.map((frame) => frame['seq'])).toEqual([2, 3]);

    fakeClient.latest!.handle.complete('completed', 0, null);
    await manager.shutdown();
  });

  it('returns seq_gone for stale subscribers after truncation', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gateway-truncate-'));
    tempDirs.push(tempDir);
    const fakeClient = createFakeRunClient();
    const manager = new RunManager(
      resolveGatewayConfig({
        eventLogDir: tempDir,
        maxEventsPerRun: 5,
        client: fakeClient,
      }),
      { debug() {}, info() {}, warn() {}, error() {} },
    );

    const run = await manager.start(
      {
        runId: '01TESTRUN000000000000000002',
        agent: 'claude',
        prompt: 'hello',
      },
      { tokenId: 'tok-1', name: 'browser' },
    );

    for (let index = 0; index < 8; index += 1) {
      fakeClient.latest!.handle.emit({
        type: 'text_delta',
        runId: run.runId,
        agent: 'claude',
        timestamp: Date.now(),
        delta: String(index),
        accumulated: String(index),
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 50));

    const conn = createStubConn('stale');
    await manager.subscribe(conn as unknown as ClientConn, run.runId, 0);
    expect(conn.frames.find((frame) => frame['type'] === 'error')).toMatchObject({
      type: 'error',
      code: 'seq_gone',
      runId: run.runId,
    });

    fakeClient.latest!.handle.complete('completed', 0, null);
    await manager.shutdown();
  });

  it('delivers hook requests, resolves first valid response, and notifies losers', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gateway-hooks-'));
    tempDirs.push(tempDir);
    const fakeClient = createFakeRunClient();
    const manager = new RunManager(
      resolveGatewayConfig({
        eventLogDir: tempDir,
        client: fakeClient,
      }),
      { debug() {}, info() {}, warn() {}, error() {} },
    );

    const run = await manager.start(
      {
        runId: '01TESTRUN000000000000000003',
        agent: 'claude',
        prompt: 'hello',
      },
      { tokenId: 'tok-1', name: 'browser' },
    );

    const left = createStubConn('left');
    const right = createStubConn('right');
    await manager.subscribe(left as unknown as ClientConn, run.runId, 0);
    await manager.subscribe(right as unknown as ClientConn, run.runId, 0);

    const decisionPromise = fakeClient.latest!.hooks!.preToolUse(
      { toolName: 'bash', input: 'rm -rf tmp' },
      { signal: AbortSignal.timeout(1000), emit: () => undefined },
    ) as Promise<unknown>;
    await new Promise((resolve) => setTimeout(resolve, 25));
    const request = left.frames.find((frame) => frame['type'] === 'hook.request')!;
    manager.submitHookDecision(left as unknown as ClientConn, {
      type: 'hook.decision',
      hookRequestId: String(request['hookRequestId']),
      decision: 'deny',
      reason: 'no',
    });

    await expect(decisionPromise).resolves.toEqual({ decision: 'deny', reason: 'no' });
    expect(right.frames.some((frame) => frame['type'] === 'hook.resolved')).toBe(true);

    fakeClient.latest!.handle.complete('completed', 0, null);
    await manager.shutdown();
  });
});
