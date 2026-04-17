import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GatewayClient } from '../src/client/GatewayClient.js';

interface FakeSocket {
  sent: string[];
  open?: () => void;
  message?: (data: string) => void;
  closeHandler?: () => void;
}

function createFakeSocketFactory() {
  const sockets: FakeSocket[] = [];
  return {
    sockets,
    createSocket() {
      const socket: FakeSocket = { sent: [] };
      sockets.push(socket);
      return {
        send(data: string) {
          socket.sent.push(data);
        },
        close() {
          socket.closeHandler?.();
        },
        onOpen(handler: () => void) {
          socket.open = handler;
        },
        onMessage(handler: (data: string) => void) {
          socket.message = handler;
        },
        onClose(handler: () => void) {
          socket.closeHandler = handler;
        },
        onError() {},
      };
    },
  };
}

describe('GatewayClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('correlates concurrent requests by id', async () => {
    const factory = createFakeSocketFactory();
    const client = new GatewayClient({
      url: 'ws://example.test',
      token: 'secret',
      createSocket: factory.createSocket,
    });

    const connectPromise = client.connect();
    factory.sockets[0]!.open?.();
    factory.sockets[0]!.message?.(JSON.stringify({ type: 'hello', protocolVersions: ['1'], serverVersion: 'test', serverTime: new Date().toISOString() }));
    await connectPromise;

    const first = client.request({ type: 'first' });
    const second = client.request({ type: 'second' });
    const sent = factory.sockets[0]!.sent.slice(1).map((entry) => JSON.parse(entry) as Record<string, unknown>);

    factory.sockets[0]!.message?.(JSON.stringify({ id: sent[1]!.id, ok: 'second' }));
    factory.sockets[0]!.message?.(JSON.stringify({ id: sent[0]!.id, ok: 'first' }));

    await expect(first).resolves.toMatchObject({ ok: 'first' });
    await expect(second).resolves.toMatchObject({ ok: 'second' });
  });

  it('replays run subscriptions with latest sinceSeq after reconnect', async () => {
    const factory = createFakeSocketFactory();
    const client = new GatewayClient({
      url: 'ws://example.test',
      token: 'secret',
      createSocket: factory.createSocket,
    });

    const connectPromise = client.connect();
    factory.sockets[0]!.open?.();
    factory.sockets[0]!.message?.(JSON.stringify({ type: 'hello', protocolVersions: ['1'], serverVersion: 'test', serverTime: new Date().toISOString() }));
    await connectPromise;

    client.subscribeRun('run-1');
    factory.sockets[0]!.message?.(JSON.stringify({
      type: 'run.event',
      runId: 'run-1',
      seq: 5,
      source: 'agent',
      event: { type: 'text_delta', delta: 'x' },
    }));
    factory.sockets[0]!.closeHandler?.();
    vi.runOnlyPendingTimers();
    factory.sockets[1]!.open?.();
    factory.sockets[1]!.message?.(JSON.stringify({ type: 'hello', protocolVersions: ['1'], serverVersion: 'test', serverTime: new Date().toISOString() }));
    await vi.runAllTimersAsync();

    const replay = factory.sockets[1]!.sent.map((entry) => JSON.parse(entry) as Record<string, unknown>);
    expect(replay.some((frame) => frame.type === 'subscribe' && frame.runId === 'run-1' && frame.sinceSeq === 5)).toBe(true);
  });

  it('waits for hello before resolving connect', async () => {
    const factory = createFakeSocketFactory();
    const client = new GatewayClient({
      url: 'ws://example.test',
      token: 'secret',
      createSocket: factory.createSocket,
    });

    let connected = false;
    const connectPromise = client.connect().then(() => {
      connected = true;
    });

    factory.sockets[0]!.open?.();
    await Promise.resolve();
    expect(connected).toBe(false);

    factory.sockets[0]!.message?.(JSON.stringify({ type: 'hello', protocolVersions: ['1'], serverVersion: 'test', serverTime: new Date().toISOString() }));
    await connectPromise;
    expect(connected).toBe(true);
  });

  it('queues subscriptions until hello completes the handshake', async () => {
    const factory = createFakeSocketFactory();
    const client = new GatewayClient({
      url: 'ws://example.test',
      token: 'secret',
      createSocket: factory.createSocket,
    });

    const connectPromise = client.connect();
    factory.sockets[0]!.open?.();
    client.subscribeRun('run-42');

    expect(factory.sockets[0]!.sent.map((entry) => JSON.parse(entry) as Record<string, unknown>)).toEqual([
      { type: 'auth', token: 'secret' },
    ]);

    factory.sockets[0]!.message?.(JSON.stringify({ type: 'hello', protocolVersions: ['1'], serverVersion: 'test', serverTime: new Date().toISOString() }));
    await connectPromise;

    expect(factory.sockets[0]!.sent.map((entry) => JSON.parse(entry) as Record<string, unknown>)).toEqual([
      { type: 'auth', token: 'secret' },
      { type: 'subscribe', runId: 'run-42', sinceSeq: 0 },
    ]);
  });
});
