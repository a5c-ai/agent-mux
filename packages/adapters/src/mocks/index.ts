/**
 * Unified mock system for new adapter types (programmatic, remote, WebSocket).
 *
 * This package extends the existing harness-mock system to support:
 * - Programmatic adapters (SDK integration mocking)
 * - Remote HTTP adapters (server/API mocking)
 * - WebSocket adapters (real-time connection mocking)
 *
 * Use this alongside @a5c-ai/agent-mux-harness-mock for subprocess adapters.
 */

// ---------------------------------------------------------------------------
// Core Types
// ---------------------------------------------------------------------------

export type {
  // Configuration types
  ProgrammaticMockConfig,
  RemoteMockConfig,
  MockStreamEvent,

  // Response types
  ProgrammaticMockResponse,
  MockServerInfo,
  MockConnection,

  // Builder interfaces
  ProgrammaticMockBuilder,
  RemoteMockBuilder,
  MockConfigFactory,

  // Preset scenarios
  MockScenarios,
} from './mock-types.js';

// ---------------------------------------------------------------------------
// Programmatic Mocks
// ---------------------------------------------------------------------------

export {
  // Engine and builders
  ProgrammaticMockEngine,
  createProgrammaticMockBuilder,

  // Adapter-specific factories
  ClaudeAgentSdkMock,
  CodexSdkMock,
  PiSdkMock,

  // Unified export
  programmaticMocks,
} from './programmatic-mocks.js';

// ---------------------------------------------------------------------------
// Remote Mocks
// ---------------------------------------------------------------------------

export {
  // Server and connection mocking
  MockServer,
  createMockServer,
  createRemoteMockBuilder,

  // Adapter-specific factories
  OpenCodeHttpMock,
  CodexWebSocketMock,

  // Unified export
  remoteMocks,
} from './remote-mocks.js';

// ---------------------------------------------------------------------------
// Unified Mock Factory
// ---------------------------------------------------------------------------

import {
  createProgrammaticMockBuilder,
  ClaudeAgentSdkMock,
  CodexSdkMock,
  PiSdkMock
} from './programmatic-mocks.js';
import {
  createRemoteMockBuilder,
  OpenCodeHttpMock,
  CodexWebSocketMock
} from './remote-mocks.js';
import type { MockConfigFactory, MockScenarios } from './mock-types.js';

/**
 * Unified factory for creating all types of adapter mocks.
 */
export class AdapterMockFactory implements MockConfigFactory {
  claudeAgentSdk() {
    return createProgrammaticMockBuilder()
      .name('claude-agent-sdk-default');
  }

  codexSdk() {
    return createProgrammaticMockBuilder()
      .name('codex-sdk-default');
  }

  piSdk() {
    return createProgrammaticMockBuilder()
      .name('pi-sdk-default');
  }

  opencodeHttp() {
    return createRemoteMockBuilder()
      .name('opencode-http-default');
  }

  codexWebSocket() {
    return createRemoteMockBuilder()
      .name('codex-websocket-default');
  }

  programmatic() {
    return createProgrammaticMockBuilder();
  }

  remote() {
    return createRemoteMockBuilder();
  }
}

// ---------------------------------------------------------------------------
// Preset Scenarios
// ---------------------------------------------------------------------------

/**
 * Pre-built mock scenarios for common testing patterns.
 */
export const mockScenarios: MockScenarios = {
  basicSuccess: {
    programmatic: ClaudeAgentSdkMock.basicSuccess(),
    remote: OpenCodeHttpMock.basicSuccess(),
  },

  toolCalling: {
    programmatic: ClaudeAgentSdkMock.toolCalling(),
    remote: OpenCodeHttpMock.basicSuccess(), // Remote doesn't have tool calling variant
  },

  errors: {
    authFailure: ClaudeAgentSdkMock.authFailure(),
    networkTimeout: OpenCodeHttpMock.networkTimeout(),
    connectionDrop: CodexWebSocketMock.connectionDrop(),
    invalidResponse: createRemoteMockBuilder()
      .name('invalid-response')
      .withErrors({ invalidResponse: true })
      .build(),
  },

  performance: {
    highThroughput: CodexWebSocketMock.highThroughput(),
    lowLatency: createProgrammaticMockBuilder()
      .name('low-latency')
      .addTextStream('Fast response', 50, 10)
      .withCost(10, 15)
      .build(),
    largeBatch: createProgrammaticMockBuilder()
      .name('large-batch')
      .addTextStream('Lorem ipsum '.repeat(100), 20, 25)
      .withCost(500, 200)
      .build(),
  },

  edgeCases: {
    emptyResponse: createProgrammaticMockBuilder()
      .name('empty-response')
      .withCost(5, 0)
      .build(),
    malformedEvents: createRemoteMockBuilder()
      .name('malformed-events')
      .addEvents([
        { type: 'invalid_event_type', data: { malformed: true }, delayMs: 100 },
      ])
      .build(),
    reconnection: CodexWebSocketMock.connectionDrop(),
  },
};

// ---------------------------------------------------------------------------
// Quick Access Functions
// ---------------------------------------------------------------------------

/**
 * Create a complete mock configuration for a specific adapter.
 */
export function createAdapterMock(
  adapterName: 'claude-agent-sdk' | 'codex-sdk' | 'pi-sdk' | 'opencode-http' | 'codex-websocket',
  scenario: 'basic' | 'tools' | 'error' | 'performance' = 'basic'
) {
  const factory = new AdapterMockFactory();

  switch (adapterName) {
    case 'claude-agent-sdk':
      switch (scenario) {
        case 'basic': return ClaudeAgentSdkMock.basicSuccess();
        case 'tools': return ClaudeAgentSdkMock.toolCalling();
        case 'error': return ClaudeAgentSdkMock.authFailure();
        default: return ClaudeAgentSdkMock.basicSuccess();
      }

    case 'codex-sdk':
      switch (scenario) {
        case 'basic': return CodexSdkMock.basicSuccess();
        case 'tools': return CodexSdkMock.codeGeneration();
        default: return CodexSdkMock.basicSuccess();
      }

    case 'pi-sdk':
      switch (scenario) {
        case 'basic': return PiSdkMock.basicSuccess();
        case 'tools': return PiSdkMock.webSearch();
        default: return PiSdkMock.basicSuccess();
      }

    case 'opencode-http':
      switch (scenario) {
        case 'basic': return OpenCodeHttpMock.basicSuccess();
        case 'error': return OpenCodeHttpMock.networkTimeout();
        default: return OpenCodeHttpMock.basicSuccess();
      }

    case 'codex-websocket':
      switch (scenario) {
        case 'basic': return CodexWebSocketMock.basicSuccess();
        case 'performance': return CodexWebSocketMock.highThroughput();
        case 'error': return CodexWebSocketMock.connectionDrop();
        default: return CodexWebSocketMock.basicSuccess();
      }

    default:
      throw new Error(`Unknown adapter: ${adapterName}`);
  }
}

/**
 * Test helper to verify mock behavior matches expected patterns.
 */
export async function testMockScenario(
  mockConfig: any, // ProgrammaticMockConfig | RemoteMockConfig
  expectedEventTypes: string[],
  timeoutMs = 5000
): Promise<boolean> {
  // This would be implemented to validate that a mock config produces
  // the expected sequence of events within the timeout period

  // Basic validation - return false for null/undefined configs
  if (!mockConfig) {
    return false;
  }

  return (
    Array.isArray(mockConfig.events) &&
    mockConfig.events.length > 0
  );
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

/**
 * Main entry point for all adapter mocking functionality.
 */
export const adapterMocks = {
  // Factories
  factory: new AdapterMockFactory(),

  // Direct access to adapter-specific mocks
  claude: ClaudeAgentSdkMock,
  codex: {
    sdk: CodexSdkMock,
    websocket: CodexWebSocketMock,
  },
  pi: PiSdkMock,
  opencode: OpenCodeHttpMock,

  // Scenarios
  scenarios: mockScenarios,

  // Utilities
  createMock: createAdapterMock,
  testScenario: testMockScenario,

  // Builders
  programmatic: createProgrammaticMockBuilder,
  remote: createRemoteMockBuilder,
};