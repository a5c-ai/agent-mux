/**
 * @a5c-ai/agent-mux-adapters
 *
 * Built-in adapter implementations for all supported agents.
 */

export { type AgentName, type BuiltInAgentName } from '@a5c-ai/agent-mux-core';

// Base adapter class
export { BaseAgentAdapter, defaultSpawner } from './base-adapter.js';

// Built-in adapters
export { ClaudeAdapter } from './claude-adapter.js';
export { CodexAdapter } from './codex-adapter.js';
export { GeminiAdapter } from './gemini-adapter.js';
export { CopilotAdapter } from './copilot-adapter.js';
export { CursorAdapter } from './cursor-adapter.js';
export { OpenCodeAdapter } from './opencode-adapter.js';
export { PiAdapter } from './pi-adapter.js';
export { OmpAdapter } from './omp-adapter.js';
export { OpenClawAdapter } from './openclaw-adapter.js';
export { HermesAdapter } from './hermes-adapter.js';
export { AgentMuxRemoteAdapter } from './agent-mux-remote-adapter.js';
export { QwenAdapter } from './qwen-adapter.js';
