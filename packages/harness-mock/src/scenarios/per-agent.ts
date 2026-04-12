/**
 * Per-agent scenario presets.
 *
 * Each of the 10 built-in agents has at least two presets emitting realistic
 * wire output (text deltas, tool calls, completion). Output strings come from
 * the deterministic wire-format helpers so the real adapter parseEvent logic
 * will parse them faithfully.
 */

import type { HarnessScenario } from '../types.js';
import {
  claudeSystemInit,
  claudeAssistantText,
  claudeToolUse,
  claudeToolResult,
  claudeResult,
  codexMessage,
  codexFunctionCall,
  codexFunctionCallOutput,
  geminiText,
  geminiToolCall,
  genericText,
  genericToolCall,
  stdoutChunk,
} from './wire-format.js';

// ---------------------------------------------------------------------------
// Claude Code
// ---------------------------------------------------------------------------

export const claudeBasicText: HarnessScenario = {
  harness: 'claude-code',
  name: 'claude:basic-text',
  process: { exitCode: 0 },
  output: [
    stdoutChunk(claudeSystemInit('sess_claude_basic', []), 5),
    stdoutChunk(claudeAssistantText('Hello! '), 20),
    stdoutChunk(claudeAssistantText('How can I help?'), 20),
    stdoutChunk(claudeResult('sess_claude_basic', 'done', { total_usd: 0.001, input_tokens: 10, output_tokens: 5 }), 10),
  ],
};

export const claudeToolCall: HarnessScenario = {
  harness: 'claude-code',
  name: 'claude:tool-call',
  process: { exitCode: 0 },
  output: [
    stdoutChunk(claudeSystemInit('sess_claude_tool', ['Read']), 5),
    stdoutChunk(claudeAssistantText('Let me read that file.'), 20),
    stdoutChunk(claudeToolUse({ id: 't1', name: 'Read', input: { file_path: '/tmp/x.txt' } }), 20),
    stdoutChunk(claudeToolResult('t1', 'file contents'), 20),
    stdoutChunk(claudeAssistantText('Got it.'), 10),
    stdoutChunk(claudeResult('sess_claude_tool', 'done'), 10),
  ],
};

export const claudeMultiTurn: HarnessScenario = {
  harness: 'claude-code',
  name: 'claude:multi-turn',
  process: { exitCode: 0 },
  output: [
    stdoutChunk(claudeSystemInit('sess_claude_multi', []), 5),
    stdoutChunk(claudeAssistantText('Turn 1.'), 10),
    stdoutChunk(claudeAssistantText('Turn 2.'), 10),
    stdoutChunk(claudeAssistantText('Turn 3.'), 10),
    stdoutChunk(claudeResult('sess_claude_multi', 'done'), 10),
  ],
};

// ---------------------------------------------------------------------------
// Codex
// ---------------------------------------------------------------------------

export const codexBasicText: HarnessScenario = {
  harness: 'codex',
  name: 'codex:basic-text',
  process: { exitCode: 0 },
  output: [
    stdoutChunk(codexMessage('Here is the answer.'), 20),
    stdoutChunk(JSON.stringify({ type: 'completed', status: 'completed' }) + '\n', 10),
  ],
};

export const codexCodeGeneration: HarnessScenario = {
  harness: 'codex',
  name: 'codex:code-generation',
  process: { exitCode: 0 },
  output: [
    stdoutChunk(codexMessage('Generating code.'), 15),
    stdoutChunk(codexFunctionCall({ id: 'call_1', name: 'apply_patch', input: { patch: '+ const x = 1;' } }), 15),
    stdoutChunk(codexFunctionCallOutput('call_1', 'patch applied'), 15),
    stdoutChunk(codexMessage('Done.'), 10),
  ],
};

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

export const geminiBasicText: HarnessScenario = {
  harness: 'gemini',
  name: 'gemini:basic-text',
  process: { exitCode: 0 },
  output: [
    stdoutChunk(geminiText('Gemini says hi.'), 15),
  ],
};

export const geminiStreaming: HarnessScenario = {
  harness: 'gemini',
  name: 'gemini:streaming',
  process: { exitCode: 0 },
  output: [
    stdoutChunk(geminiText('Streaming '), 10),
    stdoutChunk(geminiText('piece '), 10),
    stdoutChunk(geminiText('by piece.'), 10),
    stdoutChunk(JSON.stringify({ type: 'tool_call', id: 'g1', name: 'search', args: { q: 'x' } }) + '\n', 10),
  ],
};

// ---------------------------------------------------------------------------
// Generic agent scenario factory
// ---------------------------------------------------------------------------

function genericPair(harness: HarnessScenario['harness'], label: string): { basic: HarnessScenario; tool: HarnessScenario } {
  const basic: HarnessScenario = {
    harness,
    name: `${label}:basic-text`,
    process: { exitCode: 0 },
    output: [
      stdoutChunk(genericText(`Hello from ${label}.`), 15),
    ],
  };
  const tool: HarnessScenario = {
    harness,
    name: `${label}:tool-call`,
    process: { exitCode: 0 },
    output: [
      stdoutChunk(genericText(`${label} invoking tool.`), 10),
      stdoutChunk(genericToolCall({ id: `${label}-t1`, name: 'run', input: { x: 1 } }), 10),
    ],
  };
  return { basic, tool };
}

export const copilotScenarios = genericPair('copilot', 'copilot');
export const cursorScenarios = genericPair('cursor', 'cursor');
export const opencodeScenarios = genericPair('opencode', 'opencode');
export const piScenarios = genericPair('pi', 'pi');
export const ompScenarios = genericPair('omp', 'omp');
export const openclawScenarios = genericPair('openclaw', 'openclaw');
export const hermesScenarios = genericPair('hermes', 'hermes');

// ---------------------------------------------------------------------------
// Registry (name -> scenario)
// ---------------------------------------------------------------------------

export const AGENT_SCENARIOS: Record<string, HarnessScenario> = {
  'claude:basic-text': claudeBasicText,
  'claude:tool-call': claudeToolCall,
  'claude:multi-turn': claudeMultiTurn,
  'codex:basic-text': codexBasicText,
  'codex:code-generation': codexCodeGeneration,
  'gemini:basic-text': geminiBasicText,
  'gemini:streaming': geminiStreaming,
  'copilot:basic-text': copilotScenarios.basic,
  'copilot:tool-call': copilotScenarios.tool,
  'cursor:basic-text': cursorScenarios.basic,
  'cursor:tool-call': cursorScenarios.tool,
  'opencode:basic-text': opencodeScenarios.basic,
  'opencode:tool-call': opencodeScenarios.tool,
  'pi:basic-text': piScenarios.basic,
  'pi:tool-call': piScenarios.tool,
  'omp:basic-text': ompScenarios.basic,
  'omp:tool-call': ompScenarios.tool,
  'openclaw:basic-text': openclawScenarios.basic,
  'openclaw:tool-call': openclawScenarios.tool,
  'hermes:basic-text': hermesScenarios.basic,
  'hermes:tool-call': hermesScenarios.tool,
};
