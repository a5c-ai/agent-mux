import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  adapterMocks,
  AdapterMockFactory,
  mockScenarios,
  createAdapterMock,
  testMockScenario,
  ClaudeAgentSdkMock,
  CodexSdkMock,
  PiSdkMock,
  OpenCodeHttpMock,
  CodexWebSocketMock,
  MockServer,
  ProgrammaticMockEngine,
  createProgrammaticMockBuilder,
  createRemoteMockBuilder,
} from '../src/mocks/index.js';

describe('Adapter Mocks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('AdapterMockFactory', () => {
    let factory: AdapterMockFactory;

    beforeEach(() => {
      factory = new AdapterMockFactory();
    });

    it('creates claude agent sdk builder', () => {
      const builder = factory.claudeAgentSdk();
      expect(builder).toBeDefined();
      expect(typeof builder.build).toBe('function');
    });

    it('creates codex sdk builder', () => {
      const builder = factory.codexSdk();
      expect(builder).toBeDefined();
      expect(typeof builder.build).toBe('function');
    });

    it('creates pi sdk builder', () => {
      const builder = factory.piSdk();
      expect(builder).toBeDefined();
      expect(typeof builder.build).toBe('function');
    });

    it('creates opencode http builder', () => {
      const builder = factory.opencodeHttp();
      expect(builder).toBeDefined();
      expect(typeof builder.build).toBe('function');
    });

    it('creates codex websocket builder', () => {
      const builder = factory.codexWebSocket();
      expect(builder).toBeDefined();
      expect(typeof builder.build).toBe('function');
    });

    it('creates generic programmatic builder', () => {
      const builder = factory.programmatic();
      expect(builder).toBeDefined();
      expect(typeof builder.build).toBe('function');
    });

    it('creates generic remote builder', () => {
      const builder = factory.remote();
      expect(builder).toBeDefined();
      expect(typeof builder.build).toBe('function');
    });
  });

  describe('ProgrammaticMockBuilder', () => {
    it('builds basic configuration', () => {
      const config = createProgrammaticMockBuilder()
        .name('test-config')
        .withAuth(true)
        .addTextStream('Hello world')
        .withCost(50, 20)
        .build();

      expect(config.name).toBe('test-config');
      expect(config.authSucceeds).toBe(true);
      expect(config.events.length).toBeGreaterThanOrEqual(2); // Text gets chunked
      expect(config.cost).toEqual({
        inputTokens: 50,
        outputTokens: 20,
        thinkingTokens: 0,
        totalUsd: expect.any(Number),
      });
    });

    it('adds tool calling sequence', () => {
      const config = createProgrammaticMockBuilder()
        .addToolCall('read_file', '{"path": "test.txt"}', 'file contents')
        .build();

      expect(config.events).toHaveLength(4); // start, input, ready, result
      expect(config.events[0].type).toBe('tool_call_start');
      expect(config.events[1].type).toBe('tool_input_delta');
      expect(config.events[2].type).toBe('tool_call_ready');
      expect(config.events[3].type).toBe('tool_result');
    });

    it('adds thinking sequence', () => {
      const config = createProgrammaticMockBuilder()
        .addThinking('Let me think about this...')
        .build();

      expect(config.events).toHaveLength(3); // start, delta, stop
      expect(config.events[0].type).toBe('thinking_start');
      expect(config.events[1].type).toBe('thinking_delta');
      expect(config.events[2].type).toBe('thinking_stop');
    });

    it('configures error simulation', () => {
      const config = createProgrammaticMockBuilder()
        .withError('AUTH_FAILED', 'Authentication failed', 100)
        .build();

      expect(config.simulateError).toEqual({
        errorCode: 'AUTH_FAILED',
        message: 'Authentication failed',
        delayMs: 100,
      });
    });
  });

  describe('RemoteMockBuilder', () => {
    it('builds basic remote configuration', () => {
      const config = createRemoteMockBuilder()
        .name('test-remote')
        .withServer({ port: 3000, startupDelayMs: 100 })
        .withConnection({ connectDelayMs: 50 })
        .addEvents([
          { type: 'text_delta', data: { delta: 'hello' }, delayMs: 100 },
        ])
        .build();

      expect(config.name).toBe('test-remote');
      expect(config.server?.port).toBe(3000);
      expect(config.server?.startupDelayMs).toBe(100);
      expect(config.connection?.connectDelayMs).toBe(50);
      expect(config.events).toHaveLength(1);
    });

    it('configures WebSocket behavior', () => {
      const config = createRemoteMockBuilder()
        .withWebSocket({
          channels: ['chat', 'notifications'],
          pingIntervalMs: 1000,
          dropConnection: { afterMs: 5000, reconnectDelayMs: 500 },
        })
        .build();

      expect(config.websocket?.channels).toEqual(['chat', 'notifications']);
      expect(config.websocket?.pingIntervalMs).toBe(1000);
      expect(config.websocket?.dropConnection?.afterMs).toBe(5000);
    });

    it('configures HTTP behavior', () => {
      const config = createRemoteMockBuilder()
        .withHttp({
          baseUrl: 'http://localhost:8080',
          endpointDelays: { '/api/chat': 200 },
          statusCodes: { '/api/status': 200 },
        })
        .build();

      expect(config.http?.baseUrl).toBe('http://localhost:8080');
      expect(config.http?.endpointDelays?.['/api/chat']).toBe(200);
    });
  });

  describe('ProgrammaticMockEngine', () => {
    let engine: ProgrammaticMockEngine;

    beforeEach(() => {
      engine = new ProgrammaticMockEngine();
    });

    it('executes basic success scenario', async () => {
      const config = ClaudeAgentSdkMock.basicSuccess();
      const events = [];

      const eventStream = await engine.execute(config, {
        agent: 'claude-agent-sdk' as const,
        prompt: 'test'
      });

      // Advance timers to process all delays
      const eventPromise = (async () => {
        for await (const event of eventStream) {
          events.push(event);
          if (events.length >= 10) break; // Prevent infinite loop
        }
      })();

      // Fast-forward through all the delays
      await vi.advanceTimersToNextTimerAsync();
      await vi.runAllTimersAsync();
      await eventPromise;

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('session_start');
      expect(events.find(e => e.type === 'thinking_start')).toBeDefined();
      expect(events.find(e => e.type === 'text_delta')).toBeDefined();
      expect(events.find(e => e.type === 'cost')).toBeDefined();
    }, 10000);

    it('handles authentication failure', async () => {
      const config = ClaudeAgentSdkMock.authFailure();
      const events = [];

      const eventStream = await engine.execute(config, {
        agent: 'claude-agent-sdk' as const,
        prompt: 'test'
      });

      for await (const event of eventStream) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
      expect(events[0].code).toBe('AUTH_MISSING');
    });

    it('simulates configured errors', async () => {
      const config = createProgrammaticMockBuilder()
        .withError('CUSTOM_ERROR', 'Something went wrong', 50)
        .build();

      const events = [];
      const eventStream = await engine.execute(config, {
        agent: 'test' as const,
        prompt: 'test'
      });

      const eventPromise = (async () => {
        for await (const event of eventStream) {
          events.push(event);
        }
      })();

      await vi.runAllTimersAsync();
      await eventPromise;

      const errorEvent = events.find(e => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.code).toBe('CUSTOM_ERROR');
      expect(errorEvent?.message).toBe('Something went wrong');
    }, 10000);
  });

  describe('MockServer', () => {
    let server: MockServer;

    afterEach(async () => {
      if (server) {
        await server.stop();
      }
    });

    it('starts and stops successfully', async () => {
      const config = OpenCodeHttpMock.basicSuccess();
      server = new MockServer(config);

      const startPromise = server.start();
      await vi.runAllTimersAsync();
      const serverInfo = await startPromise;

      expect(serverInfo.status).toBe('running');
      expect(serverInfo.port).toBe(3000);

      await server.stop();
      expect(server.getInfo().status).toBe('stopped');
    }, 10000);

    it('handles startup failure', async () => {
      const config = OpenCodeHttpMock.serverStartupFailure();
      server = new MockServer(config);

      await expect(server.start()).rejects.toThrow('Mock server startup failed');
      expect(server.getInfo().status).toBe('error');
    });

    it('creates connections', async () => {
      const config = CodexWebSocketMock.basicSuccess();
      server = new MockServer(config);

      const startPromise = server.start();
      await vi.runAllTimersAsync();
      await startPromise;

      const connection = await server.createConnection('websocket');

      expect(connection.connectionType).toBe('websocket');
      expect(server.getConnections()).toHaveLength(1);
    }, 10000);

    it('emits server events', async () => {
      const config = OpenCodeHttpMock.basicSuccess();
      server = new MockServer(config);

      const startedPromise = new Promise(resolve => {
        server.once('started', resolve);
      });

      const startPromise = server.start();
      await vi.runAllTimersAsync();
      await startPromise;
      await startedPromise;

      expect(true).toBe(true); // Event was emitted
    }, 10000);
  });

  describe('Adapter-Specific Mocks', () => {
    describe('ClaudeAgentSdkMock', () => {
      it('creates basic success scenario', () => {
        const config = ClaudeAgentSdkMock.basicSuccess();
        expect(config.name).toBe('claude-agent-sdk-basic');
        expect(config.authSucceeds).toBe(true);
        expect(config.events.length).toBeGreaterThan(0);
        expect(config.cost).toBeDefined();
      });

      it('creates tool calling scenario', () => {
        const config = ClaudeAgentSdkMock.toolCalling();
        expect(config.name).toBe('claude-agent-sdk-tools');
        const toolEvents = config.events.filter(e => e.type.startsWith('tool_'));
        expect(toolEvents.length).toBeGreaterThan(0);
      });
    });

    describe('CodexSdkMock', () => {
      it('creates code generation scenario', () => {
        const config = CodexSdkMock.codeGeneration();
        expect(config.name).toBe('codex-sdk-codegen');
        const codeExecuteEvent = config.events.find(e =>
          e.type === 'tool_call_start' && e.data.toolName === 'code_execute'
        );
        expect(codeExecuteEvent).toBeDefined();
      });
    });

    describe('PiSdkMock', () => {
      it('creates web search scenario', () => {
        const config = PiSdkMock.webSearch();
        expect(config.name).toBe('pi-sdk-web-search');
        const searchEvent = config.events.find(e =>
          e.type === 'tool_call_start' && e.data.toolName === 'search_web'
        );
        expect(searchEvent).toBeDefined();
      });
    });

    describe('OpenCodeHttpMock', () => {
      it('creates network timeout scenario', () => {
        const config = OpenCodeHttpMock.networkTimeout();
        expect(config.name).toBe('opencode-http-timeout');
        expect(config.simulateErrors?.networkTimeout).toBe(true);
      });
    });

    describe('CodexWebSocketMock', () => {
      it('creates connection drop scenario', () => {
        const config = CodexWebSocketMock.connectionDrop();
        expect(config.name).toBe('codex-websocket-drop');
        expect(config.connection?.disconnectAfterEvents).toBe(2);
        expect(config.websocket?.dropConnection).toBeDefined();
      });

      it('creates high throughput scenario', () => {
        const config = CodexWebSocketMock.highThroughput();
        expect(config.name).toBe('codex-websocket-high-throughput');
        expect(config.events.length).toBeGreaterThan(50); // Many rapid events
      });
    });
  });

  describe('Mock Scenarios', () => {
    it('provides basic success scenarios', () => {
      expect(mockScenarios.basicSuccess.programmatic).toBeDefined();
      expect(mockScenarios.basicSuccess.remote).toBeDefined();
      expect(mockScenarios.basicSuccess.programmatic.authSucceeds).toBe(true);
    });

    it('provides error scenarios', () => {
      expect(mockScenarios.errors.authFailure).toBeDefined();
      expect(mockScenarios.errors.networkTimeout).toBeDefined();
      expect(mockScenarios.errors.connectionDrop).toBeDefined();
      expect(mockScenarios.errors.invalidResponse).toBeDefined();
    });

    it('provides performance scenarios', () => {
      expect(mockScenarios.performance.highThroughput).toBeDefined();
      expect(mockScenarios.performance.lowLatency).toBeDefined();
      expect(mockScenarios.performance.largeBatch).toBeDefined();
    });

    it('provides edge case scenarios', () => {
      expect(mockScenarios.edgeCases.emptyResponse).toBeDefined();
      expect(mockScenarios.edgeCases.malformedEvents).toBeDefined();
      expect(mockScenarios.edgeCases.reconnection).toBeDefined();
    });
  });

  describe('Utility Functions', () => {
    it('creates adapter mock with different scenarios', () => {
      const basicClaude = createAdapterMock('claude-agent-sdk', 'basic');
      expect(basicClaude.name).toBe('claude-agent-sdk-basic');

      const toolsClaude = createAdapterMock('claude-agent-sdk', 'tools');
      expect(toolsClaude.name).toBe('claude-agent-sdk-tools');

      const errorClaude = createAdapterMock('claude-agent-sdk', 'error');
      expect(errorClaude.authSucceeds).toBe(false);
    });

    it('validates mock scenarios', async () => {
      const config = ClaudeAgentSdkMock.basicSuccess();
      const isValid = await testMockScenario(config, ['session_start', 'text_delta']);
      expect(isValid).toBe(true);

      const invalidConfig = null;
      const isInvalid = await testMockScenario(invalidConfig, ['session_start']);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Integration', () => {
    it('provides complete mock ecosystem', () => {
      // Test that all main exports are available
      expect(adapterMocks.factory).toBeInstanceOf(AdapterMockFactory);
      expect(adapterMocks.claude).toBe(ClaudeAgentSdkMock);
      expect(adapterMocks.codex.sdk).toBe(CodexSdkMock);
      expect(adapterMocks.codex.websocket).toBe(CodexWebSocketMock);
      expect(adapterMocks.pi).toBe(PiSdkMock);
      expect(adapterMocks.opencode).toBe(OpenCodeHttpMock);
      expect(adapterMocks.scenarios).toBe(mockScenarios);
      expect(typeof adapterMocks.createMock).toBe('function');
      expect(typeof adapterMocks.testScenario).toBe('function');
    });

    it('works with programmatic and remote builders', () => {
      const programmaticBuilder = adapterMocks.programmatic();
      const remoteBuilder = adapterMocks.remote();

      expect(typeof programmaticBuilder.build).toBe('function');
      expect(typeof remoteBuilder.build).toBe('function');

      const progConfig = programmaticBuilder
        .name('integration-test')
        .withAuth(true)
        .addTextStream('Integration test response')
        .build();

      const remoteConfig = remoteBuilder
        .name('integration-test-remote')
        .withServer({ port: 9000 })
        .addEvents([{ type: 'test_event', data: { test: true } }])
        .build();

      expect(progConfig.name).toBe('integration-test');
      expect(remoteConfig.name).toBe('integration-test-remote');
    });
  });
});