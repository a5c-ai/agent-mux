import * as os from 'node:os';
import * as path from 'node:path';

import type { RunHandle, RunOptions } from '@a5c-ai/agent-mux-core';

import type { TokenStore } from './auth/tokens.js';
import type { NotificationWebhookConfig } from './notifications/types.js';

export interface GatewayRunClient {
  run(options: RunOptions): RunHandle;
}

export interface GatewayConfig {
  host: string;
  port: number;
  webuiRoot?: string | null;
  enableWebui: boolean;
  serverVersion: string;
  unauthenticatedTimeoutMs: number;
  maxPendingFrames: number;
  tokenStore?: TokenStore;
  tokenStoreKind: 'sqlite' | 'memory';
  tokenDbPath: string;
  eventLogDir: string;
  maxEventsPerRun: number;
  replayBufferSize: number;
  maxConcurrentRuns: number;
  shutdownGraceMs: number;
  hookDecisionTimeoutMs: number;
  notificationWebhook?: NotificationWebhookConfig | null;
  client?: GatewayRunClient;
}

export const DEFAULT_GATEWAY_CONFIG: Readonly<GatewayConfig> = Object.freeze({
  host: '127.0.0.1',
  port: 7878,
  webuiRoot: null,
  enableWebui: true,
  serverVersion: '0.0.0',
  unauthenticatedTimeoutMs: 5000,
  maxPendingFrames: 1024,
  tokenStoreKind: 'sqlite',
  tokenDbPath: path.join(os.homedir(), '.amux', 'gateway', 'tokens.db'),
  eventLogDir: path.join(os.homedir(), '.amux', 'gateway', 'events'),
  maxEventsPerRun: 100_000,
  replayBufferSize: 512,
  maxConcurrentRuns: 16,
  shutdownGraceMs: 5000,
  hookDecisionTimeoutMs: 30_000,
  notificationWebhook: null,
});

export function resolveGatewayConfig(config: Partial<GatewayConfig> = {}): GatewayConfig {
  return {
    ...DEFAULT_GATEWAY_CONFIG,
    ...config,
  };
}
