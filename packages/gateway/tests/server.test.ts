import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { once } from 'node:events';

import { describe, expect, it } from 'vitest';
import WebSocket from 'ws';

import { createGateway, MemoryTokenStore } from '../src/index.js';
import { resolveWebuiRoot } from '../src/static/webui-server.js';

describe('gateway server', () => {
  it('serves healthz and protects /api/v1 with bearer auth', async () => {
    const tokenStore = new MemoryTokenStore();
    const token = await tokenStore.create({ name: 'apitest' });
    const gateway = createGateway({
      host: '127.0.0.1',
      port: 0,
      tokenStore,
      tokenStoreKind: 'memory',
      unauthenticatedTimeoutMs: 100,
    });

    await gateway.start();
    const port = gateway.server.address.port;

    const health = await fetch(`http://127.0.0.1:${port}/healthz`);
    expect(health.status).toBe(200);

    const unauthorized = await fetch(`http://127.0.0.1:${port}/api/v1/tokens`);
    expect(unauthorized.status).toBe(401);

    const authorized = await fetch(`http://127.0.0.1:${port}/api/v1/tokens`, {
      headers: {
        Authorization: `Bearer ${token.plaintext}`,
      },
    });
    expect(authorized.status).toBe(200);

    await gateway.stop();
  });

  it('closes unauthenticated websocket clients and accepts auth frames', async () => {
    const tokenStore = new MemoryTokenStore();
    const token = await tokenStore.create({ name: 'ws-client' });
    const gateway = createGateway({
      host: '127.0.0.1',
      port: 0,
      tokenStore,
      tokenStoreKind: 'memory',
      unauthenticatedTimeoutMs: 500,
    });

    await gateway.start();
    const port = gateway.server.address.port;

    const timedOutSocket = new WebSocket(`ws://127.0.0.1:${port}`);
    const timedOutCode = await new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timed out waiting for websocket close')), 2000);
      timedOutSocket.once('close', (code) => {
        clearTimeout(timeout);
        resolve(code);
      });
      timedOutSocket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    expect(timedOutCode).toBe(4401);

    const authedSocket = new WebSocket(`ws://127.0.0.1:${port}`);
    await once(authedSocket, 'open');
    authedSocket.send(JSON.stringify({ type: 'auth', token: token.plaintext }));
    const helloRaw = await new Promise<Buffer>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timed out waiting for hello frame')), 2000);
      authedSocket.once('message', (payload) => {
        clearTimeout(timeout);
        resolve(payload as Buffer);
      });
      authedSocket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      authedSocket.once('close', (code) => {
        clearTimeout(timeout);
        reject(new Error(`socket closed before hello: ${code}`));
      });
    });
    const hello = JSON.parse(helloRaw.toString('utf8'));
    expect(hello.type).toBe('hello');
    authedSocket.close();

    await gateway.stop();
  }, 10000);

  it('serves a configured webui root from /', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gateway-webui-'));
    await fs.writeFile(path.join(tempDir, 'index.html'), '<html><body>ok</body></html>', 'utf8');
    const tokenStore = new MemoryTokenStore();
    const gateway = createGateway({
      host: '127.0.0.1',
      port: 0,
      tokenStore,
      tokenStoreKind: 'memory',
      webuiRoot: tempDir,
      enableWebui: true,
    });

    await gateway.start();
    const port = gateway.server.address.port;

    const response = await fetch(`http://127.0.0.1:${port}/`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('ok');

    await gateway.stop();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('finds the repo-local webui dist by default when available', () => {
    const root = resolveWebuiRoot(null);
    expect(root).toBeTruthy();
    expect(path.basename(root!)).toBe('dist');
  });
});
