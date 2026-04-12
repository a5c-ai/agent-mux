import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StreamAssembler } from '@a5c-ai/agent-mux-core';
import type { ParseContext } from '@a5c-ai/agent-mux-core';
import { CodexAdapter } from '../src/codex-adapter.js';

function makeContext(overrides?: Partial<ParseContext>): ParseContext {
  return {
    runId: 'test-run-1',
    agent: 'codex',
    sessionId: undefined,
    turnIndex: 0,
    debug: false,
    outputFormat: 'jsonl',
    source: 'stdout',
    assembler: new StreamAssembler(),
    eventCount: 0,
    lastEventType: null,
    adapterState: {},
    ...overrides,
  };
}

describe('CodexAdapter', () => {
  let adapter: CodexAdapter;

  beforeEach(() => {
    adapter = new CodexAdapter();
  });

  describe('identity', () => {
    it('has correct agent name', () => {
      expect(adapter.agent).toBe('codex');
    });

    it('has correct display name', () => {
      expect(adapter.displayName).toBe('OpenAI Codex');
    });

    it('has correct CLI command', () => {
      expect(adapter.cliCommand).toBe('codex');
    });
  });

  describe('capabilities', () => {
    it('declares agent as codex', () => {
      expect(adapter.capabilities.agent).toBe('codex');
    });

    it('supports resume but not fork', () => {
      expect(adapter.capabilities.canResume).toBe(true);
      expect(adapter.capabilities.canFork).toBe(false);
    });

    it('does not support thinking', () => {
      expect(adapter.capabilities.supportsThinking).toBe(false);
    });

    it('uses file session persistence', () => {
      expect(adapter.capabilities.sessionPersistence).toBe('file');
    });
  });

  describe('models', () => {
    it('has at least one model', () => {
      expect(adapter.models.length).toBeGreaterThanOrEqual(1);
    });

    it('has a default model', () => {
      expect(adapter.defaultModelId).toBeDefined();
    });
  });

  describe('buildSpawnArgs', () => {
    it('builds basic spawn args', () => {
      const result = adapter.buildSpawnArgs({
        agent: 'codex',
        prompt: 'Fix the bug',
      });

      expect(result.command).toBe('codex');
      expect(result.args).toContain('--quiet');
      expect(result.args).toContain('Fix the bug');
    });

    it('includes model flag', () => {
      const result = adapter.buildSpawnArgs({
        agent: 'codex',
        prompt: 'Test',
        model: 'o4-mini',
      });

      expect(result.args).toContain('--model');
      expect(result.args).toContain('o4-mini');
    });

    it('sets full-auto for yolo mode', () => {
      const result = adapter.buildSpawnArgs({
        agent: 'codex',
        prompt: 'Test',
        approvalMode: 'yolo',
      });

      expect(result.args).toContain('--full-auto');
    });

    it('joins array prompts', () => {
      const result = adapter.buildSpawnArgs({
        agent: 'codex',
        prompt: ['First', 'Second'],
      });

      expect(result.args).toContain('First\nSecond');
    });
  });

  describe('parseEvent', () => {
    it('returns null for non-JSON', () => {
      expect(adapter.parseEvent('plain text', makeContext())).toBeNull();
    });

    it('parses message events', () => {
      const result = adapter.parseEvent(
        JSON.stringify({ type: 'message', content: 'Response text' }),
        makeContext(),
      );
      const event = result as { type: string; delta: string };
      expect(event.type).toBe('text_delta');
      expect(event.delta).toBe('Response text');
    });

    it('parses function_call events', () => {
      const result = adapter.parseEvent(
        JSON.stringify({ type: 'function_call', id: 'fc-1', name: 'write_file', arguments: '{}' }),
        makeContext(),
      );
      const event = result as { type: string; toolName: string };
      expect(event.type).toBe('tool_call_start');
      expect(event.toolName).toBe('write_file');
    });

    it('parses function_call_output events', () => {
      const result = adapter.parseEvent(
        JSON.stringify({ type: 'function_call_output', call_id: 'fc-1', output: 'done' }),
        makeContext(),
      );
      const event = result as { type: string; toolCallId: string };
      expect(event.type).toBe('tool_result');
      expect(event.toolCallId).toBe('fc-1');
    });

    it('parses error events', () => {
      const result = adapter.parseEvent(
        JSON.stringify({ type: 'error', message: 'Something failed' }),
        makeContext(),
      );
      const event = result as { type: string; message: string };
      expect(event.type).toBe('error');
      expect(event.message).toBe('Something failed');
    });
  });

  describe('detectAuth', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('returns authenticated with OPENAI_API_KEY', async () => {
      process.env['OPENAI_API_KEY'] = 'sk-test1234abcd';
      const state = await adapter.detectAuth();
      expect(state.status).toBe('authenticated');
      expect(state.method).toBe('api_key');
    });

    it('returns unauthenticated without key', async () => {
      delete process.env['OPENAI_API_KEY'];
      const state = await adapter.detectAuth();
      expect(state.status).toBe('unauthenticated');
    });
  });

  describe('getAuthGuidance', () => {
    it('returns valid guidance', () => {
      const guidance = adapter.getAuthGuidance();
      expect(guidance.agent).toBe('codex');
      expect(guidance.providerName).toBe('OpenAI');
      expect(guidance.steps.length).toBeGreaterThan(0);
    });

    it('includes OPENAI_API_KEY in env vars', () => {
      const guidance = adapter.getAuthGuidance();
      const envVarNames = guidance.envVars!.map(v => typeof v === 'string' ? v : v.name);
      expect(envVarNames).toContain('OPENAI_API_KEY');
    });
  });

  describe('sessionDir', () => {
    it('returns a path containing .codex', () => {
      expect(adapter.sessionDir()).toContain('.codex');
    });
  });

  describe('placeholder methods', () => {
    it('listSessionFiles returns an array', async () => {
      expect(Array.isArray(await adapter.listSessionFiles())).toBe(true);
    });

    it('readConfig returns default', async () => {
      const config = await adapter.readConfig();
      expect(config.agent).toBe('codex');
    });
  });
});
