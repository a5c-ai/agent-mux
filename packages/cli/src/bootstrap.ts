/**
 * Bootstrap helper: registers all built-in agent adapters with a client.
 *
 * The core `AdapterRegistry` starts empty — adapters must be explicitly
 * registered. This module centralises that wiring so the CLI (and any
 * consumer) gets all 11 built-in adapters with a single call.
 */

import type { AgentMuxClient } from '@a5c-ai/agent-mux-core';
import type { AgentAdapter } from '@a5c-ai/agent-mux-core';
import {
  ClaudeAdapter,
  CodexAdapter,
  GeminiAdapter,
  CopilotAdapter,
  CursorAdapter,
  OpenCodeAdapter,
  PiAdapter,
  OmpAdapter,
  OpenClawAdapter,
  HermesAdapter,
  AgentMuxRemoteAdapter,
  QwenAdapter,
} from '@a5c-ai/agent-mux-adapters';

/**
 * Registers every built-in adapter on the given client's adapter registry.
 * Safe to call multiple times — `register()` replaces existing entries.
 */
export function registerBuiltInAdapters(client: AgentMuxClient): void {
  const adapters: AgentAdapter[] = [
    new ClaudeAdapter(),
    new CodexAdapter(),
    new GeminiAdapter(),
    new CopilotAdapter(),
    new CursorAdapter(),
    new OpenCodeAdapter(),
    new PiAdapter(),
    new OmpAdapter(),
    new OpenClawAdapter(),
    new HermesAdapter(),
    new AgentMuxRemoteAdapter(),
    new QwenAdapter(),
  ];

  // Prefer `registerBuiltIn` on the impl so the `source` shows as 'built-in';
  // fall back to the public `register()` (which marks as 'plugin') for any
  // AdapterRegistry implementation that doesn't expose the built-in helper.
  const registry = client.adapters as unknown as {
    registerBuiltIn?: (a: AgentAdapter) => void;
    register: (a: AgentAdapter) => void;
  };

  for (const adapter of adapters) {
    if (typeof registry.registerBuiltIn === 'function') {
      registry.registerBuiltIn(adapter);
    } else {
      registry.register(adapter);
    }
  }
}
