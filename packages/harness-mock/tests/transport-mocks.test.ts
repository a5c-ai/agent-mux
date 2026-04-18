import { describe, it, expect } from 'vitest';
import { HttpServerMock, WebSocketServerMock } from '../src/index.js';
import type { HarnessScenario } from '../src/types.js';

describe('transport mocks', () => {
  it('HttpServerMock serves requests and records history', async () => {
    const scenario: HarnessScenario = {
      harness: 'opencode-http',
      executionType: 'http',
      httpServer: {
        port: 19081,
        routes: {
          '/status': {
            status: 200,
            body: { ok: true },
          },
        },
      },
    };

    const mock = new HttpServerMock(scenario, 1);
    await mock.start();
    const response = await fetch(`${mock.serverUrl}/status`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mock.requestHistory).toHaveLength(1);
    await mock.stop();
    const result = await mock.waitForCompletion();
    expect(result.results.type).toBe('http');
  });

  it('WebSocketServerMock replays events and tracks connection history', async () => {
    const scenario: HarnessScenario = {
      harness: 'codex-websocket',
      executionType: 'websocket',
      websocketServer: {
        port: 19082,
      },
      events: [
        { type: 'text_delta', data: { delta: 'hello' }, delayMs: 1 },
        { type: 'message_stop', data: {}, delayMs: 1 },
      ],
    };

    const mock = new WebSocketServerMock(scenario, 2);
    await mock.start();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mock.connectionCount).toBeGreaterThanOrEqual(1);
    expect(mock.messageHistory.some((entry) => entry.direction === 'outbound')).toBe(true);

    const connectionId = mock.getConnectionStatus()[0]?.connectionId;
    expect(connectionId).toBeTruthy();
    mock.receiveFrom(connectionId!, { type: 'user_message', text: 'ping' });
    expect(mock.messageHistory.some((entry) => entry.direction === 'inbound')).toBe(true);

    mock.broadcast({ type: 'server_ping' });
    expect(mock.messageHistory.some((entry) => entry.message && typeof entry.message === 'object' && 'type' in (entry.message as Record<string, unknown>) && (entry.message as Record<string, unknown>)['type'] === 'server_ping')).toBe(true);
    mock.dropConnection(connectionId!);
    expect(mock.connectionCount).toBe(0);

    await mock.stop();
    const result = await mock.waitForCompletion();
    expect(result.results.type).toBe('websocket');
  });
});
