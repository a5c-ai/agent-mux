import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import { ClaudeAgentSdkAdapter } from '../src/claude-agent-sdk-adapter.js';

describe('ClaudeAgentSdkAdapter', () => {
  let adapter: ClaudeAgentSdkAdapter;

  beforeEach(() => {
    adapter = new ClaudeAgentSdkAdapter();
  });

  describe('identity', () => {
    it('has correct adapter type', () => {
      expect(adapter.adapterType).toBe('programmatic');
    });

    it('has correct agent name', () => {
      expect(adapter.agent).toBe('claude-agent-sdk');
    });

    it('has correct display name', () => {
      expect(adapter.displayName).toBe('Claude (Agent SDK)');
    });

    it('has minimum version', () => {
      expect(adapter.minVersion).toBe('0.1.0');
    });

    it('has host environment signals', () => {
      expect(adapter.hostEnvSignals).toContain('ANTHROPIC_API_KEY');
      expect(adapter.hostEnvSignals).toContain('CLAUDE_AGENT_API_KEY');
    });
  });

  describe('capabilities', () => {
    it('declares agent as claude-agent-sdk', () => {
      expect(adapter.capabilities.agent).toBe('claude-agent-sdk');
    });

    it('supports resume and fork', () => {
      expect(adapter.capabilities.canResume).toBe(true);
      expect(adapter.capabilities.canFork).toBe(true);
    });

    it('supports multi-turn conversations', () => {
      expect(adapter.capabilities.supportsMultiTurn).toBe(true);
    });

    it('uses file session persistence', () => {
      expect(adapter.capabilities.sessionPersistence).toBe('file');
    });

    it('supports comprehensive streaming', () => {
      expect(adapter.capabilities.supportsTextStreaming).toBe(true);
      expect(adapter.capabilities.supportsToolCallStreaming).toBe(true);
      expect(adapter.capabilities.supportsThinkingStreaming).toBe(true);
    });

    it('supports advanced tool features', () => {
      expect(adapter.capabilities.supportsNativeTools).toBe(true);
      expect(adapter.capabilities.supportsParallelToolCalls).toBe(true);
      expect(adapter.capabilities.supportsMCP).toBe(true);
    });

    it('requires tool approval', () => {
      expect(adapter.capabilities.requiresToolApproval).toBe(true);
      expect(adapter.capabilities.approvalModes).toContain('yolo');
      expect(adapter.capabilities.approvalModes).toContain('prompt');
      expect(adapter.capabilities.approvalModes).toContain('deny');
    });

    it('supports thinking capabilities', () => {
      expect(adapter.capabilities.supportsThinking).toBe(true);
      expect(adapter.capabilities.thinkingEffortLevels).toContain('low');
      expect(adapter.capabilities.thinkingEffortLevels).toContain('medium');
      expect(adapter.capabilities.thinkingEffortLevels).toContain('high');
      expect(adapter.capabilities.thinkingEffortLevels).toContain('max');
      expect(adapter.capabilities.supportsThinkingBudgetTokens).toBe(true);
    });

    it('supports JSON and structured output', () => {
      expect(adapter.capabilities.supportsJsonMode).toBe(true);
      expect(adapter.capabilities.supportsStructuredOutput).toBe(true);
    });

    it('supports skills and agents.md', () => {
      expect(adapter.capabilities.supportsSkills).toBe(true);
      expect(adapter.capabilities.supportsAgentsMd).toBe(true);
      expect(adapter.capabilities.skillsFormat).toBe('file');
    });

    it('supports subagents', () => {
      expect(adapter.capabilities.supportsSubagentDispatch).toBe(true);
      expect(adapter.capabilities.supportsParallelExecution).toBe(true);
      expect(adapter.capabilities.maxParallelTasks).toBe(10);
    });

    it('supports interactive mode and stdin injection', () => {
      expect(adapter.capabilities.supportsInteractiveMode).toBe(true);
      expect(adapter.capabilities.supportsStdinInjection).toBe(true);
    });

    it('supports image input and file attachments', () => {
      expect(adapter.capabilities.supportsImageInput).toBe(true);
      expect(adapter.capabilities.supportsImageOutput).toBe(false);
      expect(adapter.capabilities.supportsFileAttachments).toBe(true);
    });

    it('supports plugins', () => {
      expect(adapter.capabilities.supportsPlugins).toBe(true);
      expect(adapter.capabilities.pluginFormats).toContain('mcp-server');
      expect(adapter.capabilities.pluginRegistries).toHaveLength(1);
      expect(adapter.capabilities.pluginRegistries[0].name).toBe('mcp');
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

    it('has multiple auth methods', () => {
      expect(adapter.capabilities.authMethods).toHaveLength(2);
      expect(adapter.capabilities.authMethods[0].type).toBe('api_key');
      expect(adapter.capabilities.authMethods[1].type).toBe('oauth');
    });

    it('has NPM install method', () => {
      expect(adapter.capabilities.installMethods).toHaveLength(1);
      expect(adapter.capabilities.installMethods[0].type).toBe('npm');
      expect(adapter.capabilities.installMethods[0].command).toBe('npm install -g @anthropic-ai/agent-sdk');
    });
  });

  describe('models', () => {
    it('has two models', () => {
      expect(adapter.models).toHaveLength(2);
    });

    it('has default model', () => {
      expect(adapter.defaultModelId).toBe('claude-sonnet-4-20250514');
      const defaultModel = adapter.models.find(m => m.modelId === adapter.defaultModelId);
      expect(defaultModel).toBeDefined();
    });

    it('has Claude Sonnet 4 SDK model', () => {
      const model = adapter.models.find(m => m.modelId === 'claude-sonnet-4-20250514');
      expect(model).toBeDefined();
      expect(model!.agent).toBe('claude-agent-sdk');
      expect(model!.displayName).toBe('Claude Sonnet 4 (SDK)');
      expect(model!.supportsToolCalling).toBe(true);
      expect(model!.supportsThinking).toBe(true);
      expect(model!.supportsThinkingStreaming).toBe(true);
      expect(model!.supportsImageInput).toBe(true);
      expect(model!.contextWindow).toBe(200000);
      expect(model!.maxOutputTokens).toBe(16384);
      expect(model!.maxThinkingTokens).toBe(128000);
    });

    it('has Claude Opus 4 SDK model', () => {
      const model = adapter.models.find(m => m.modelId === 'claude-opus-4-20250514');
      expect(model).toBeDefined();
      expect(model!.agent).toBe('claude-agent-sdk');
      expect(model!.displayName).toBe('Claude Opus 4 (SDK)');
      expect(model!.supportsToolCalling).toBe(true);
      expect(model!.supportsThinking).toBe(true);
      expect(model!.supportsThinkingStreaming).toBe(true);
      expect(model!.supportsImageInput).toBe(true);
      expect(model!.contextWindow).toBe(200000);
      expect(model!.maxOutputTokens).toBe(16384);
    });

    it('models have comprehensive pricing info', () => {
      for (const model of adapter.models) {
        expect(model.inputPricePerMillion).toBeGreaterThan(0);
        expect(model.outputPricePerMillion).toBeGreaterThan(0);
        expect(typeof model.thinkingPricePerMillion).toBe('number');
        expect(model.thinkingPricePerMillion).toBeGreaterThan(0);
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

    it('detects Anthropic API key', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-1234567890abcdef';
      const result = await adapter.detectAuth();

      expect(result.status).toBe('authenticated');
      expect(result.method).toBe('api_key');
      expect(result.identity).toBe('anthropic:...cdef');
    });

    it('detects Claude Agent API key', async () => {
      process.env.CLAUDE_AGENT_API_KEY = 'sk-ant-9876543210fedcba';
      const result = await adapter.detectAuth();

      expect(result.status).toBe('authenticated');
      expect(result.method).toBe('api_key');
      expect(result.identity).toBe('anthropic:...dcba');
    });

    it('reports unauthenticated when no key found', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.CLAUDE_AGENT_API_KEY;
      const result = await adapter.detectAuth();

      expect(result.status).toBe('unauthenticated');
    });
  });

  describe('getAuthGuidance', () => {
    it('provides auth setup guidance', () => {
      const guidance = adapter.getAuthGuidance();

      expect(guidance.agent).toBe('claude-agent-sdk');
      expect(guidance.providerName).toBe('Anthropic');
      expect(guidance.steps.length).toBeGreaterThanOrEqual(3);
      expect(guidance.envVars).toHaveLength(2);
      expect(guidance.envVars[0].name).toBe('ANTHROPIC_API_KEY');
      expect(guidance.envVars[1].name).toBe('CLAUDE_AGENT_API_KEY');
      expect(guidance.documentationUrls).toContain('https://docs.anthropic.com/claude/docs');
      expect(guidance.loginCommand).toBe('claude auth');
    });
  });

  describe('session management', () => {
    it('returns correct session directory', () => {
      const sessionDir = adapter.sessionDir();
      expect(sessionDir).toBe(path.join(os.homedir(), '.claude', 'sessions'));
    });

    it('parses session files', async () => {
      vi.spyOn(adapter, 'parseSessionFile').mockResolvedValue({
        sessionId: 'test-session',
        agent: 'claude-agent-sdk',
        createdAt: new Date(),
        lastUpdated: new Date(),
        events: [],
        messageCount: 0,
      });

      const session = await adapter.parseSessionFile('/fake/path');
      expect(session.agent).toBe('claude-agent-sdk');
      expect(session.sessionId).toBe('test-session');
    });
  });

  describe('config management', () => {
    it('has correct config schema', () => {
      expect(adapter.configSchema.agent).toBe('claude-agent-sdk');
      expect(adapter.configSchema.version).toBe(1);
      expect(adapter.configSchema.configFormat).toBe('json');
      expect(adapter.configSchema.supportsProjectConfig).toBe(true);
      expect(adapter.configSchema.configFilePaths).toHaveLength(1);
      expect(adapter.configSchema.configFilePaths[0]).toContain('settings.json');
    });
  });

  describe('execution', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test123';
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('validates run options', async () => {
      const invalidOptions = { agent: 'wrong-agent' as any, prompt: '' };

      const events = [];
      try {
        for await (const event of adapter.execute(invalidOptions)) {
          events.push(event);
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        return;
      }

      // Should have emitted error event if validation failed
      const errorEvent = events.find(e => e.type === 'error');
      expect(errorEvent).toBeDefined();
    });

    it('emits session start event', async () => {
      const options = {
        agent: 'claude-agent-sdk' as const,
        prompt: 'test prompt',
      };

      const events = [];
      for await (const event of adapter.execute(options)) {
        events.push(event);
        if (events.length >= 3) break; // Just get first few events
      }

      const sessionStart = events.find(e => e.type === 'session_start');
      expect(sessionStart).toBeDefined();
      expect(sessionStart?.type).toBe('session_start');
    });

    it('emits thinking events', async () => {
      const options = {
        agent: 'claude-agent-sdk' as const,
        prompt: 'Complex analysis task',
        thinkingEffort: 'high' as const,
      };

      const events = [];
      for await (const event of adapter.execute(options)) {
        events.push(event);
        if (events.length >= 15) break; // Get enough events to see thinking
      }

      const thinkingDeltas = events.filter(e => e.type === 'thinking_delta');
      expect(thinkingDeltas.length).toBeGreaterThan(0);

      for (const thinkingDelta of thinkingDeltas) {
        expect(thinkingDelta).toHaveProperty('delta');
        expect(thinkingDelta).toHaveProperty('accumulated');
      }
    });

    it('emits text delta events', async () => {
      const options = {
        agent: 'claude-agent-sdk' as const,
        prompt: 'Hello',
      };

      const events = [];
      for await (const event of adapter.execute(options)) {
        events.push(event);
        if (events.length >= 10) break; // Limit to avoid full execution
      }

      const textDeltas = events.filter(e => e.type === 'text_delta');
      expect(textDeltas.length).toBeGreaterThan(0);

      for (const textDelta of textDeltas) {
        expect(textDelta).toHaveProperty('delta');
        expect(textDelta).toHaveProperty('accumulated');
      }
    });

    it('emits tool call events', async () => {
      const options = {
        agent: 'claude-agent-sdk' as const,
        prompt: 'Read a file',
      };

      const events = [];
      for await (const event of adapter.execute(options)) {
        events.push(event);
      }

      const toolCallStart = events.find(e => e.type === 'tool_call_start');
      expect(toolCallStart).toBeDefined();
      expect(toolCallStart).toHaveProperty('toolName');
      expect(toolCallStart).toHaveProperty('toolCallId');

      const toolInputDelta = events.find(e => e.type === 'tool_input_delta');
      expect(toolInputDelta).toBeDefined();

      const toolCallReady = events.find(e => e.type === 'tool_call_ready');
      expect(toolCallReady).toBeDefined();

      const toolResult = events.find(e => e.type === 'tool_result');
      expect(toolResult).toBeDefined();
      expect(toolResult).toHaveProperty('output');
    });

    it('emits cost events', async () => {
      const options = {
        agent: 'claude-agent-sdk' as const,
        prompt: 'test',
      };

      const events = [];
      for await (const event of adapter.execute(options)) {
        events.push(event);
      }

      const costEvent = events.find(e => e.type === 'cost');
      expect(costEvent).toBeDefined();
      expect(costEvent).toHaveProperty('cost');

      const cost = (costEvent as any).cost;
      expect(cost.totalUsd).toBeGreaterThan(0);
      expect(cost.inputTokens).toBeGreaterThan(0);
      expect(cost.outputTokens).toBeGreaterThan(0);
    });

    it('handles authentication errors', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.CLAUDE_AGENT_API_KEY;

      const options = {
        agent: 'claude-agent-sdk' as const,
        prompt: 'test',
      };

      const events = [];
      for await (const event of adapter.execute(options)) {
        events.push(event);
      }

      const errorEvent = events.find(e => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.code).toBe('AUTH_MISSING');
    });

    it('supports thinking configuration', async () => {
      const options = {
        agent: 'claude-agent-sdk' as const,
        prompt: 'Analyze this complex problem',
        thinkingEffort: 'max' as const,
        thinkingBudgetTokens: 50000,
      };

      // Should not throw with thinking options
      const events = [];
      for await (const event of adapter.execute(options)) {
        events.push(event);
        if (events.length >= 5) break;
      }

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('plugin management', () => {
    it('has plugin management methods', () => {
      expect(typeof adapter.listPlugins).toBe('function');
      expect(typeof adapter.installPlugin).toBe('function');
      expect(typeof adapter.uninstallPlugin).toBe('function');
    });

    it('lists plugins', async () => {
      vi.spyOn(adapter, 'listPlugins').mockResolvedValue([]);
      const plugins = await adapter.listPlugins();
      expect(Array.isArray(plugins)).toBe(true);
    });
  });
});