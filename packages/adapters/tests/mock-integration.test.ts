/**
 * Mock integration: feed harness-mock scenario output through real adapter
 * parseEvent implementations and assert AgentEvents surface correctly.
 */

import { describe, it, expect } from 'vitest';
import { StreamAssembler } from '@a5c-ai/agent-mux-core';
import type { ParseContext, AgentEvent } from '@a5c-ai/agent-mux-core';

import { ClaudeAdapter } from '../src/claude-adapter.js';
import { CodexAdapter } from '../src/codex-adapter.js';
import { GeminiAdapter } from '../src/gemini-adapter.js';
import { CopilotAdapter } from '../src/copilot-adapter.js';
import { CursorAdapter } from '../src/cursor-adapter.js';
import { OpenCodeAdapter } from '../src/opencode-adapter.js';
import { PiAdapter } from '../src/pi-adapter.js';
import { OmpAdapter } from '../src/omp-adapter.js';
import { OpenClawAdapter } from '../src/openclaw-adapter.js';
import { HermesAdapter } from '../src/hermes-adapter.js';

import {
  AGENT_SCENARIOS,
  ERROR_SCENARIOS,
} from '../../harness-mock/src/index.js';
import type { HarnessScenario } from '../../harness-mock/src/types.js';

function makeContext(agent: string): ParseContext {
  return {
    runId: 'mock-run',
    agent: agent as ParseContext['agent'],
    sessionId: undefined,
    turnIndex: 0,
    debug: false,
    outputFormat: 'jsonl',
    source: 'stdout',
    assembler: new StreamAssembler(),
    eventCount: 0,
    lastEventType: null,
    adapterState: {},
  };
}

function feed(adapter: { parseEvent: (line: string, ctx: ParseContext) => AgentEvent | AgentEvent[] | null }, scenario: HarnessScenario, agent: string): AgentEvent[] {
  const ctx = makeContext(agent);
  const lines: string[] = [];
  for (const c of scenario.output) {
    if (c.stream !== 'stdout') continue;
    for (const raw of c.data.split('\n')) {
      if (raw.trim().length > 0) lines.push(raw);
    }
  }
  const events: AgentEvent[] = [];
  for (const line of lines) {
    const out = adapter.parseEvent(line, ctx);
    if (out == null) continue;
    if (Array.isArray(out)) events.push(...out);
    else events.push(out);
  }
  return events;
}

describe('adapter × mock scenarios', () => {
  const cases: Array<{ agent: string; adapter: { parseEvent: (l: string, c: ParseContext) => AgentEvent | AgentEvent[] | null }; scenarios: string[] }> = [
    { agent: 'claude', adapter: new ClaudeAdapter(), scenarios: ['claude:basic-text', 'claude:tool-call'] },
    { agent: 'codex', adapter: new CodexAdapter(), scenarios: ['codex:basic-text', 'codex:code-generation'] },
    { agent: 'gemini', adapter: new GeminiAdapter(), scenarios: ['gemini:basic-text', 'gemini:streaming'] },
    { agent: 'copilot', adapter: new CopilotAdapter(), scenarios: ['copilot:basic-text'] },
    { agent: 'cursor', adapter: new CursorAdapter(), scenarios: ['cursor:basic-text', 'cursor:tool-call'] },
    { agent: 'opencode', adapter: new OpenCodeAdapter(), scenarios: ['opencode:basic-text', 'opencode:tool-call'] },
    { agent: 'pi', adapter: new PiAdapter(), scenarios: ['pi:basic-text', 'pi:tool-call'] },
    { agent: 'omp', adapter: new OmpAdapter(), scenarios: ['omp:basic-text', 'omp:tool-call'] },
    { agent: 'openclaw', adapter: new OpenClawAdapter(), scenarios: ['openclaw:basic-text', 'openclaw:tool-call'] },
    { agent: 'hermes', adapter: new HermesAdapter(), scenarios: ['hermes:basic-text', 'hermes:tool-call'] },
  ];

  for (const c of cases) {
    for (const sid of c.scenarios) {
      it(`${c.agent} parses ${sid}`, () => {
        const scen = AGENT_SCENARIOS[sid]!;
        const events = feed(c.adapter, scen, c.agent);
        expect(events.length).toBeGreaterThan(0);
        // At least one text_delta
        expect(events.some((e) => e.type === 'text_delta')).toBe(true);
        // If scenario name mentions tool, expect a tool_call_start
        if (sid.includes('tool') || sid.includes('code-generation')) {
          expect(events.some((e) => e.type === 'tool_call_start')).toBe(true);
        }
      });
    }
  }

  it('rate-limit error scenario surfaces an error event', () => {
    const meta = ERROR_SCENARIOS['rate-limit']!;
    const events = feed(new ClaudeAdapter(), meta.scenario, 'claude');
    const err = events.find((e) => e.type === 'error') as AgentEvent & { message?: string } | undefined;
    expect(err).toBeDefined();
    expect(err?.message).toContain('Rate limit');
  });

  it('auth-required error scenario surfaces an error event', () => {
    const meta = ERROR_SCENARIOS['auth-required']!;
    const events = feed(new CodexAdapter(), meta.scenario, 'codex');
    const err = events.find((e) => e.type === 'error');
    expect(err).toBeDefined();
  });
});
