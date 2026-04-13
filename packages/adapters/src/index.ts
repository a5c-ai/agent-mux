/**
 * @a5c-ai/agent-mux-adapters
 *
 * Built-in adapter implementations for all supported agents.
 */

export { type AgentName, type BuiltInAgentName } from '@a5c-ai/agent-mux-core';

// Base adapter classes
export { BaseAgentAdapter, defaultSpawner } from './base-adapter.js';
export { BaseRemoteAdapter } from './remote-adapter-base.js';
export { BaseProgrammaticAdapter } from './programmatic-adapter-base.js';

// Built-in adapters
export { ClaudeAdapter } from './claude-adapter.js';
export { ClaudeAgentSdkAdapter } from './claude-agent-sdk-adapter.js';
export { CodexAdapter } from './codex-adapter.js';
export { CodexSdkAdapter } from './codex-sdk-adapter.js';
export { CodexWebSocketAdapter } from './codex-websocket-adapter.js';
export { DroidAdapter } from './droid-adapter.js';
export { AmpAdapter } from './amp-adapter.js';
export { GeminiAdapter } from './gemini-adapter.js';
export { CopilotAdapter } from './copilot-adapter.js';
export { CursorAdapter } from './cursor-adapter.js';
export { OpenCodeAdapter } from './opencode-adapter.js';
export { OpenCodeHttpAdapter } from './opencode-http-adapter.js';
export { PiAdapter } from './pi-adapter.js';
export { PiSdkAdapter } from './pi-sdk-adapter.js';
export { OmpAdapter } from './omp-adapter.js';
export { OpenClawAdapter } from './openclaw-adapter.js';
export { HermesAdapter } from './hermes-adapter.js';
export { AgentMuxRemoteAdapter } from './agent-mux-remote-adapter.js';
export { QwenAdapter } from './qwen-adapter.js';

// Mock infrastructure for new adapter types
export {
  // Mock types
  type ProgrammaticMockConfig,
  type RemoteMockConfig,
  type MockStreamEvent,
  type ProgrammaticMockResponse,
  type MockServerInfo,
  type MockConnection,
  type ProgrammaticMockBuilder,
  type RemoteMockBuilder,
  type MockConfigFactory,
  type MockScenarios,

  // Mock engines and builders
  AdapterMockFactory,
  ProgrammaticMockEngine,
  MockServer,
  createProgrammaticMockBuilder,
  createRemoteMockBuilder,
  createMockServer,

  // Adapter-specific mocks
  ClaudeAgentSdkMock,
  CodexSdkMock,
  PiSdkMock,
  OpenCodeHttpMock,
  CodexWebSocketMock,

  // Unified exports
  adapterMocks,
  mockScenarios,
  createAdapterMock,
  testMockScenario,

  // Convenience exports
  programmaticMocks,
  remoteMocks,
} from './mocks/index.js';
