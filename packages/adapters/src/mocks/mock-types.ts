/**
 * Mock types for new adapter architectures (programmatic, remote, WebSocket).
 *
 * These mocks complement the existing harness-mock package which focuses on
 * subprocess adapters. These types handle:
 * - Programmatic adapters (SDK integration)
 * - Remote HTTP/WebSocket adapters
 * - Connection lifecycle simulation
 * - Real-time streaming behaviors
 */

import type { AgentEvent, RunOptions } from '@a5c-ai/agent-mux-core';

// ---------------------------------------------------------------------------
// Programmatic Mock Types
// ---------------------------------------------------------------------------

/**
 * Configuration for mocking SDK behavior in programmatic adapters.
 */
export interface ProgrammaticMockConfig {
  /** Mock scenario name for identification */
  name?: string;

  /** Whether authentication should succeed */
  authSucceeds: boolean;

  /** Sequence of events to emit during execution */
  events: MockStreamEvent[];

  /** Delay before starting to emit events (ms) */
  startDelayMs?: number;

  /** Whether to simulate SDK errors */
  simulateError?: {
    errorCode: string;
    message: string;
    delayMs?: number;
  };

  /** Cost information to return */
  cost?: {
    inputTokens: number;
    outputTokens: number;
    thinkingTokens?: number;
    totalUsd: number;
  };
}

/**
 * A mock event in the stream with timing and content.
 */
export interface MockStreamEvent {
  /** Event type matching AgentEvent taxonomy */
  type: string;

  /** Event data/payload */
  data: Record<string, unknown>;

  /** Delay before this event (ms, relative to previous) */
  delayMs?: number;
}

// ---------------------------------------------------------------------------
// Remote Mock Types
// ---------------------------------------------------------------------------

/**
 * Configuration for mocking remote server/connection behavior.
 */
export interface RemoteMockConfig {
  /** Mock scenario name */
  name?: string;

  /** Server startup behavior */
  server?: {
    /** Delay before server becomes ready */
    startupDelayMs?: number;
    /** Port to simulate (for testing) */
    port?: number;
    /** Whether server startup should fail */
    startupFails?: boolean;
  };

  /** Connection behavior */
  connection?: {
    /** Delay for connection establishment */
    connectDelayMs?: number;
    /** Whether connection should fail */
    connectFails?: boolean;
    /** Disconnect after N events (for testing reconnection) */
    disconnectAfterEvents?: number;
  };

  /** WebSocket-specific behavior */
  websocket?: {
    /** Channels to simulate */
    channels?: string[];
    /** Ping/pong intervals (ms) */
    pingIntervalMs?: number;
    /** Simulated connection drops */
    dropConnection?: {
      afterMs: number;
      reconnectDelayMs?: number;
    };
  };

  /** HTTP-specific behavior */
  http?: {
    /** Base URL for simulation */
    baseUrl?: string;
    /** Response delays for different endpoints */
    endpointDelays?: Record<string, number>;
    /** Status codes to return */
    statusCodes?: Record<string, number>;
  };

  /** Events to emit during session */
  events: MockStreamEvent[];

  /** Whether to simulate various error conditions */
  simulateErrors?: {
    networkTimeout?: boolean;
    connectionReset?: boolean;
    invalidResponse?: boolean;
    authFailure?: boolean;
  };
}

// ---------------------------------------------------------------------------
// Mock Response Types
// ---------------------------------------------------------------------------

/**
 * Response from a programmatic mock execution.
 */
export interface ProgrammaticMockResponse {
  /** All events that were emitted */
  events: AgentEvent[];

  /** Total duration of the mock execution */
  durationMs: number;

  /** Whether the execution completed successfully */
  success: boolean;

  /** Error information if execution failed */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Information about a mock remote server instance.
 */
export interface MockServerInfo {
  /** Server ID for tracking */
  serverId: string;

  /** Simulated endpoint */
  endpoint: string;

  /** Port (simulated) */
  port: number;

  /** Server start time */
  startedAt: Date;

  /** Current status */
  status: 'starting' | 'running' | 'stopped' | 'error';
}

/**
 * Mock connection handle for remote adapters.
 */
export interface MockConnection {
  /** Connection ID */
  connectionId: string;

  /** Connection type */
  connectionType: 'http' | 'websocket';

  /** Endpoint URL */
  endpoint: string;

  /** Connection state */
  state: 'connecting' | 'connected' | 'disconnected' | 'error';

  /** Send data through the mock connection */
  send(data: unknown): Promise<void>;

  /** Receive events from the mock connection */
  receive(): AsyncIterableIterator<AgentEvent>;

  /** Close the mock connection */
  close(): Promise<void>;

  /** Get connection statistics */
  getStats(): {
    eventsReceived: number;
    eventsSent: number;
    connectTime: Date;
    lastActivity: Date;
  };
}

// ---------------------------------------------------------------------------
// Builder Types
// ---------------------------------------------------------------------------

/**
 * Builder interface for creating programmatic mocks.
 */
export interface ProgrammaticMockBuilder {
  /** Set mock name */
  name(name: string): this;

  /** Configure authentication behavior */
  withAuth(succeeds: boolean): this;

  /** Add events to the stream */
  addEvents(events: MockStreamEvent[]): this;

  /** Add a single event */
  addEvent(type: string, data: Record<string, unknown>, delayMs?: number): this;

  /** Add realistic text streaming events */
  addTextStream(text: string, chunkSize?: number, delayBetweenChunks?: number): this;

  /** Add tool calling sequence */
  addToolCall(toolName: string, input: string, output: unknown, processingTimeMs?: number): this;

  /** Add thinking sequence (for Claude) */
  addThinking(thinkingContent: string, delayMs?: number): this;

  /** Add cost information */
  withCost(inputTokens: number, outputTokens: number, thinkingTokens?: number): this;

  /** Simulate an error */
  withError(code: string, message: string, delayMs?: number): this;

  /** Build the final configuration */
  build(): ProgrammaticMockConfig;
}

/**
 * Builder interface for creating remote mocks.
 */
export interface RemoteMockBuilder {
  /** Set mock name */
  name(name: string): this;

  /** Configure server behavior */
  withServer(config: RemoteMockConfig['server']): this;

  /** Configure connection behavior */
  withConnection(config: RemoteMockConfig['connection']): this;

  /** Configure WebSocket-specific behavior */
  withWebSocket(config: RemoteMockConfig['websocket']): this;

  /** Configure HTTP-specific behavior */
  withHttp(config: RemoteMockConfig['http']): this;

  /** Add events to emit */
  addEvents(events: MockStreamEvent[]): this;

  /** Add error simulation */
  withErrors(errors: RemoteMockConfig['simulateErrors']): this;

  /** Build the final configuration */
  build(): RemoteMockConfig;
}

// ---------------------------------------------------------------------------
// Factory Types
// ---------------------------------------------------------------------------

/**
 * Factory for creating adapter-specific mock configurations.
 */
export interface MockConfigFactory {
  /** Create Claude Agent SDK mock */
  claudeAgentSdk(): ProgrammaticMockBuilder;

  /** Create Codex SDK mock */
  codexSdk(): ProgrammaticMockBuilder;

  /** Create Pi SDK mock */
  piSdk(): ProgrammaticMockBuilder;

  /** Create OpenCode HTTP mock */
  opencodeHttp(): RemoteMockBuilder;

  /** Create Codex WebSocket mock */
  codexWebSocket(): RemoteMockBuilder;

  /** Create custom programmatic mock */
  programmatic(): ProgrammaticMockBuilder;

  /** Create custom remote mock */
  remote(): RemoteMockBuilder;
}

// ---------------------------------------------------------------------------
// Preset Scenario Types
// ---------------------------------------------------------------------------

/**
 * Pre-built mock scenarios for common test cases.
 */
export interface MockScenarios {
  /** Basic successful text generation */
  basicSuccess: {
    programmatic: ProgrammaticMockConfig;
    remote: RemoteMockConfig;
  };

  /** Tool calling scenarios */
  toolCalling: {
    programmatic: ProgrammaticMockConfig;
    remote: RemoteMockConfig;
  };

  /** Error conditions */
  errors: {
    authFailure: ProgrammaticMockConfig;
    networkTimeout: RemoteMockConfig;
    connectionDrop: RemoteMockConfig;
    invalidResponse: RemoteMockConfig;
  };

  /** Performance testing */
  performance: {
    highThroughput: RemoteMockConfig;
    lowLatency: ProgrammaticMockConfig;
    largeBatch: ProgrammaticMockConfig;
  };

  /** Edge cases */
  edgeCases: {
    emptyResponse: ProgrammaticMockConfig;
    malformedEvents: RemoteMockConfig;
    reconnection: RemoteMockConfig;
  };
}