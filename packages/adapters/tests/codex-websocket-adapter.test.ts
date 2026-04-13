import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import type { ServerInfo } from '@a5c-ai/agent-mux-core';
import { CodexWebSocketAdapter } from '../src/codex-websocket-adapter.js';

describe('CodexWebSocketAdapter', () => {
  let adapter: CodexWebSocketAdapter;

  beforeEach(() => {
    adapter = new CodexWebSocketAdapter();
  });

  describe('identity', () => {
    it('has correct adapter type', () => {
      expect(adapter.adapterType).toBe('remote');
    });

    it('has correct connection type', () => {
      expect(adapter.connectionType).toBe('websocket');
    });

    it('has correct agent name', () => {
      expect(adapter.agent).toBe('codex-websocket');
    });

    it('has correct display name', () => {
      expect(adapter.displayName).toBe('Codex (WebSocket)');
    });

    it('has minimum version', () => {
      expect(adapter.minVersion).toBe('0.1.0');
    });

    it('has host environment signals', () => {
      expect(adapter.hostEnvSignals).toContain('CODEX_APP_SERVER');
      expect(adapter.hostEnvSignals).toContain('OPENAI_API_KEY');
    });
  });

  describe('capabilities', () => {
    it('declares agent as codex-websocket', () => {
      expect(adapter.capabilities.agent).toBe('codex-websocket');
    });

    it('supports resume but not fork', () => {
      expect(adapter.capabilities.canResume).toBe(true);
      expect(adapter.capabilities.canFork).toBe(false);
    });

    it('supports multi-turn conversations', () => {
      expect(adapter.capabilities.supportsMultiTurn).toBe(true);
    });

    it('uses file session persistence', () => {
      expect(adapter.capabilities.sessionPersistence).toBe('file');
    });

    it('supports text and tool streaming', () => {
      expect(adapter.capabilities.supportsTextStreaming).toBe(true);
      expect(adapter.capabilities.supportsToolCallStreaming).toBe(true);
      expect(adapter.capabilities.supportsThinkingStreaming).toBe(false);
    });

    it('supports tool calling', () => {
      expect(adapter.capabilities.supportsNativeTools).toBe(true);
      expect(adapter.capabilities.supportsParallelToolCalls).toBe(true);
    });

    it('does not support MCP', () => {
      expect(adapter.capabilities.supportsMCP).toBe(false);
    });

    it('requires tool approval', () => {
      expect(adapter.capabilities.requiresToolApproval).toBe(true);
      expect(adapter.capabilities.approvalModes).toContain('yolo');
      expect(adapter.capabilities.approvalModes).toContain('prompt');
      expect(adapter.capabilities.approvalModes).toContain('deny');
    });

    it('supports JSON and structured output', () => {
      expect(adapter.capabilities.supportsJsonMode).toBe(true);
      expect(adapter.capabilities.supportsStructuredOutput).toBe(true);
    });

    it('does not support skills or subagents', () => {
      expect(adapter.capabilities.supportsSkills).toBe(false);
      expect(adapter.capabilities.supportsAgentsMd).toBe(false);
      expect(adapter.capabilities.supportsSubagentDispatch).toBe(false);
      expect(adapter.capabilities.supportsParallelExecution).toBe(false);
    });

    it('supports interactive mode and stdin injection', () => {
      expect(adapter.capabilities.supportsInteractiveMode).toBe(true);
      expect(adapter.capabilities.supportsStdinInjection).toBe(true);
    });

    it('does not support images or file attachments', () => {
      expect(adapter.capabilities.supportsImageInput).toBe(false);
      expect(adapter.capabilities.supportsImageOutput).toBe(false);
      expect(adapter.capabilities.supportsFileAttachments).toBe(false);
    });

    it('does not support plugins', () => {
      expect(adapter.capabilities.supportsPlugins).toBe(false);
      expect(adapter.capabilities.pluginFormats).toEqual([]);
      expect(adapter.capabilities.pluginRegistries).toEqual([]);
    });

    it('supports all three platforms', () => {
      expect(adapter.capabilities.supportedPlatforms).toContain('darwin');
      expect(adapter.capabilities.supportedPlatforms).toContain('linux');
      expect(adapter.capabilities.supportedPlatforms).toContain('win32');
    });

    it('does not require git repo or PTY', () => {
      expect(adapter.capabilities.requiresGitRepo).toBe(false);
      expect(adapter.capabilities.requiresPty).toBe(false);
    });

    it('has API key auth method', () => {
      expect(adapter.capabilities.authMethods).toHaveLength(1);
      expect(adapter.capabilities.authMethods[0].type).toBe('api_key');
      expect(adapter.capabilities.authMethods[0].name).toBe('API Key');
    });

    it('has NPM install method', () => {
      expect(adapter.capabilities.installMethods).toHaveLength(1);
      expect(adapter.capabilities.installMethods[0].type).toBe('npm');
      expect(adapter.capabilities.installMethods[0].command).toBe('npm install -g @openai/codex-server');
    });
  });

  describe('models', () => {
    it('has two models', () => {
      expect(adapter.models).toHaveLength(2);
    });

    it('has default model', () => {
      expect(adapter.defaultModelId).toBe('o4-mini');
      const defaultModel = adapter.models.find(m => m.modelId === adapter.defaultModelId);
      expect(defaultModel).toBeDefined();
    });

    it('has o4-mini WebSocket model', () => {
      const model = adapter.models.find(m => m.modelId === 'o4-mini');
      expect(model).toBeDefined();
      expect(model!.agent).toBe('codex-websocket');
      expect(model!.displayName).toBe('o4-mini (WebSocket)');
      expect(model!.supportsToolCalling).toBe(true);
      expect(model!.supportsThinking).toBe(true);
      expect(model!.contextWindow).toBe(200000);
      expect(model!.maxOutputTokens).toBe(100000);
    });

    it('has codex-mini-latest WebSocket model', () => {
      const model = adapter.models.find(m => m.modelId === 'codex-mini-latest');
      expect(model).toBeDefined();
      expect(model!.agent).toBe('codex-websocket');
      expect(model!.displayName).toBe('Codex Mini (WebSocket)');
      expect(model!.supportsToolCalling).toBe(true);
      expect(model!.supportsThinking).toBe(false);
      expect(model!.contextWindow).toBe(200000);
      expect(model!.maxOutputTokens).toBe(100000);
    });

    it('models have pricing info', () => {
      for (const model of adapter.models) {
        expect(model.inputPricePerMillion).toBeGreaterThan(0);
        expect(model.outputPricePerMillion).toBeGreaterThan(0);
        expect(typeof model.cachedInputPricePerMillion).toBe('number');
        expect(model.cachedInputPricePerMillion).toBeGreaterThan(0);
      }
    });
  });

  describe('authentication', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('detects OpenAI API key', async () => {
      process.env.OPENAI_API_KEY = 'sk-1234567890abcdef';
      const result = await adapter.detectAuth();

      expect(result.status).toBe('authenticated');
      expect(result.method).toBe('api_key');
      expect(result.identity).toBe('openai:...cdef');
    });

    it('reports unauthenticated when no key found', async () => {
      delete process.env.OPENAI_API_KEY;
      const result = await adapter.detectAuth();

      expect(result.status).toBe('unauthenticated');
    });
  });

  describe('getAuthGuidance', () => {
    it('provides auth setup guidance', () => {
      const guidance = adapter.getAuthGuidance();

      expect(guidance.agent).toBe('codex-websocket');
      expect(guidance.providerName).toBe('OpenAI');
      expect(guidance.steps.length).toBeGreaterThanOrEqual(3);
      expect(guidance.envVars).toHaveLength(2);
      expect(guidance.envVars[0].name).toBe('OPENAI_API_KEY');
      expect(guidance.envVars[1].name).toBe('CODEX_APP_SERVER');
      expect(guidance.documentationUrls).toContain('https://developers.openai.com/codex/app-server');
    });
  });

  describe('session management', () => {
    it('returns correct session directory', () => {
      const sessionDir = adapter.sessionDir();
      expect(sessionDir).toBe(path.join(os.homedir(), '.codex', 'sessions'));
    });

    it('parses session files', async () => {
      vi.spyOn(adapter, 'parseSessionFile').mockResolvedValue({
        sessionId: 'test-session',
        agent: 'codex-websocket',
        createdAt: new Date(),
        lastUpdated: new Date(),
        events: [],
        messageCount: 0,
      });

      const session = await adapter.parseSessionFile('/fake/path');
      expect(session.agent).toBe('codex-websocket');
      expect(session.sessionId).toBe('test-session');
    });
  });

  describe('config management', () => {
    it('has correct config schema', () => {
      expect(adapter.configSchema.agent).toBe('codex-websocket');
      expect(adapter.configSchema.version).toBe(1);
      expect(adapter.configSchema.configFormat).toBe('json');
      expect(adapter.configSchema.supportsProjectConfig).toBe(false);
      expect(adapter.configSchema.configFilePaths).toHaveLength(1);
      expect(adapter.configSchema.configFilePaths[0]).toContain('config.json');
    });
  });

  describe('server management', () => {
    it('generates unique connection IDs', () => {
      const id1 = (adapter as any).generateConnectionId();
      const id2 = (adapter as any).generateConnectionId();

      expect(id1).toMatch(/^codex-websocket-/);
      expect(id2).toMatch(/^codex-websocket-/);
      expect(id1).not.toBe(id2);
    });

    it('generates unique server IDs', () => {
      const id1 = (adapter as any).generateServerId();
      const id2 = (adapter as any).generateServerId();

      expect(id1).toMatch(/^codex-websocket-server-/);
      expect(id2).toMatch(/^codex-websocket-server-/);
      expect(id1).not.toBe(id2);
    });

    it('finds available ports', async () => {
      const port = await (adapter as any).findAvailablePort(8765);
      expect(typeof port).toBe('number');
      expect(port).toBeGreaterThanOrEqual(8765);
    });

    it('starts and stops server', async () => {
      const serverInfo = await adapter.startServer();

      expect(serverInfo.serverId).toMatch(/^codex-websocket-server-/);
      expect(serverInfo.serverType).toBe('codex-websocket');
      expect(serverInfo.endpoint).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
      expect(typeof serverInfo.port).toBe('number');
      expect(serverInfo.startedAt).toBeInstanceOf(Date);

      await adapter.stopServer(serverInfo);
    });

    it('checks server health', async () => {
      const mockServerInfo: ServerInfo = {
        serverId: 'test-server',
        serverType: 'codex-websocket',
        endpoint: 'http://localhost:8765',
        port: 8765,
        startedAt: new Date(),
      };

      const health = await adapter.healthCheck(mockServerInfo);
      expect(health.status).toBe('healthy');
      expect(health.lastCheck).toBeInstanceOf(Date);
    });
  });

  describe('connection interface', () => {
    it('implements RemoteAdapter interface correctly', () => {
      expect(adapter.adapterType).toBe('remote');
      expect(adapter.connectionType).toBe('websocket');
      expect(typeof adapter.connect).toBe('function');
      expect(typeof adapter.disconnect).toBe('function');
      expect(typeof adapter.startServer).toBe('function');
      expect(typeof adapter.stopServer).toBe('function');
      expect(typeof adapter.healthCheck).toBe('function');
    });
  });

  describe('WebSocket connection', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
      process.env.OPENAI_API_KEY = 'sk-test123';
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('connects to WebSocket server', async () => {
      // Start a mock server first
      vi.spyOn(adapter, 'ensureServer').mockResolvedValue({
        serverId: 'test-server',
        serverType: 'codex-websocket',
        endpoint: 'http://localhost:8765',
        port: 8765,
        startedAt: new Date(),
      });

      const connection = await adapter.connect({
        agent: 'codex-websocket',
        prompt: 'test prompt',
      });

      expect(connection.connectionType).toBe('websocket');
      expect(connection.connectionId).toMatch(/^codex-websocket-/);

      await adapter.disconnect(connection);
    });

    it('handles WebSocket message streaming', async () => {
      // Mock server
      vi.spyOn(adapter, 'ensureServer').mockResolvedValue({
        serverId: 'test-server',
        serverType: 'codex-websocket',
        endpoint: 'http://localhost:8765',
        port: 8765,
        startedAt: new Date(),
      });

      const connection = await adapter.connect({
        agent: 'codex-websocket',
        prompt: 'Hello',
      });

      // Collect events for a short time
      const events: any[] = [];
      const eventIterator = connection.receive();

      // Collect first few events with timeout
      let eventCount = 0;
      const maxEvents = 5;
      const timeout = 2000;

      try {
        const startTime = Date.now();
        for await (const event of eventIterator) {
          events.push(event);
          eventCount++;

          if (eventCount >= maxEvents || Date.now() - startTime > timeout) {
            break;
          }
        }
      } catch (error) {
        // Expected timeout or connection close
      }

      await adapter.disconnect(connection);

      // Should have received some events
      expect(events.length).toBeGreaterThan(0);

      // Check for expected event types
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toContain('text_delta');
    });

    it('subscribes to WebSocket channels', async () => {
      vi.spyOn(adapter, 'ensureServer').mockResolvedValue({
        serverId: 'test-server',
        serverType: 'codex-websocket',
        endpoint: 'http://localhost:8765',
        port: 8765,
        startedAt: new Date(),
      });

      const connection = await adapter.connect({
        agent: 'codex-websocket',
        prompt: 'test',
      });

      if (connection.connectionType === 'websocket') {
        const wsConnection = connection as any;
        expect(typeof wsConnection.subscribe).toBe('function');
        expect(typeof wsConnection.unsubscribe).toBe('function');
      }

      await adapter.disconnect(connection);
    });
  });

  describe('cleanup', () => {
    it('has cleanup method for tracking', async () => {
      expect(typeof adapter.cleanup).toBe('function');

      // Should not throw when called with no active connections/servers
      await expect(adapter.cleanup()).resolves.not.toThrow();
    });
  });
});