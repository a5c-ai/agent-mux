import type { GatewayRunClient } from './config.js';

import { createClient } from '@a5c-ai/agent-mux-core';
import {
  AgentMuxRemoteAdapter,
  AmpAdapter,
  ClaudeAdapter,
  ClaudeAgentSdkAdapter,
  CodexAdapter,
  CodexSdkAdapter,
  CodexWebSocketAdapter,
  CopilotAdapter,
  CursorAdapter,
  DroidAdapter,
  GeminiAdapter,
  HermesAdapter,
  OmpAdapter,
  OpenClawAdapter,
  OpenCodeAdapter,
  OpenCodeHttpAdapter,
  PiAdapter,
  PiSdkAdapter,
  QwenAdapter,
} from '@a5c-ai/agent-mux-adapters';

export function createGatewayRunClient(): GatewayRunClient {
  const client = createClient();
  const registry = client.adapters as unknown as {
    registerBuiltIn?: (adapter: unknown) => void;
    register: (adapter: unknown) => void;
  };
  const adapters = [
    new ClaudeAdapter(),
    new ClaudeAgentSdkAdapter(),
    new CodexAdapter(),
    new CodexSdkAdapter(),
    new CodexWebSocketAdapter(),
    new DroidAdapter(),
    new AmpAdapter(),
    new GeminiAdapter(),
    new CopilotAdapter(),
    new CursorAdapter(),
    new OpenCodeAdapter(),
    new OpenCodeHttpAdapter(),
    new PiAdapter(),
    new PiSdkAdapter(),
    new OmpAdapter(),
    new OpenClawAdapter(),
    new HermesAdapter(),
    new AgentMuxRemoteAdapter(),
    new QwenAdapter(),
  ];

  for (const adapter of adapters) {
    if (typeof registry.registerBuiltIn === 'function') {
      registry.registerBuiltIn(adapter);
      continue;
    }
    registry.register(adapter);
  }

  return client;
}

export function listBuiltInAgentNames(): string[] {
  const client = createGatewayRunClient() as ReturnType<typeof createClient>;
  return client.adapters.list().map((entry) => entry.agent);
}

export interface RunnableGatewayAgent {
  agent: string;
  displayName: string;
  adapterType: string;
  structuredSessionTransport: 'none' | 'restart-per-turn' | 'persistent';
  supportsInteractiveMode: boolean;
  canResume: boolean;
}

type DetectableGatewayClient = GatewayRunClient & {
  adapters?: {
    list(): Array<{ agent: string; displayName: string }>;
    installed(): Promise<Array<{ agent: string; installed: boolean; meetsMinVersion: boolean }>>;
    get(agent: string): {
      adapterType?: string;
      capabilities?: {
        structuredSessionTransport?: 'none' | 'restart-per-turn' | 'persistent';
        supportsInteractiveMode?: boolean;
        canResume?: boolean;
      };
    } | undefined;
  };
};

export async function listRunnableGatewayAgents(client?: GatewayRunClient): Promise<RunnableGatewayAgent[]> {
  const detectable = client as DetectableGatewayClient | undefined;
  if (!detectable?.adapters) {
    return listBuiltInAgentNames().map((agent) => ({
      agent,
      displayName: agent,
      adapterType: 'subprocess',
      structuredSessionTransport: 'none',
      supportsInteractiveMode: false,
      canResume: false,
    }));
  }

  const [entries, installed] = await Promise.all([
    Promise.resolve(detectable.adapters.list()),
    detectable.adapters.installed(),
  ]);

  const installMap = new Map(installed.map((entry) => [entry.agent, entry]));
  const runnable = entries.flatMap((entry) => {
    const adapter = detectable.adapters?.get(entry.agent);
    const status = installMap.get(entry.agent);
    if (!status?.installed || !status.meetsMinVersion) {
      return [];
    }
    return [{
      agent: entry.agent,
      displayName: entry.displayName,
      adapterType: adapter?.adapterType ?? 'subprocess',
      structuredSessionTransport: adapter?.capabilities?.structuredSessionTransport ?? 'none',
      supportsInteractiveMode: adapter?.capabilities?.supportsInteractiveMode ?? false,
      canResume: adapter?.capabilities?.canResume ?? false,
    }];
  });

  if (runnable.length > 0) {
    return runnable;
  }

  return listBuiltInAgentNames().map((agent) => ({
    agent,
    displayName: agent,
    adapterType: 'subprocess',
    structuredSessionTransport: 'none',
    supportsInteractiveMode: false,
    canResume: false,
  }));
}

export async function listRunnableGatewayAgentNames(client?: GatewayRunClient): Promise<string[]> {
  const runnable = await listRunnableGatewayAgents(client);
  return runnable.map((entry) => entry.agent);
}
