/**
 * Deterministic wire-format helpers.
 *
 * Produce raw stdout/stderr strings matching the formats the real adapter
 * parseEvent implementations consume. Each helper returns a string ending
 * with a newline where appropriate so chunks can be concatenated cleanly.
 */

import type { OutputChunk } from '../types.js';

export interface ToolCall {
  id: string;
  name: string;
  input?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Claude Code JSONL
// ---------------------------------------------------------------------------

export function claudeSystemInit(sessionId: string, tools: string[] = []): string {
  return JSON.stringify({ type: 'system', subtype: 'init', session_id: sessionId, tools }) + '\n';
}

export function claudeAssistantText(text: string): string {
  return JSON.stringify({ type: 'assistant', content: text }) + '\n';
}

export function claudeToolUse(call: ToolCall): string {
  return JSON.stringify({ type: 'tool_use', id: call.id, name: call.name, input: call.input ?? {} }) + '\n';
}

export function claudeToolResult(toolUseId: string, output: string): string {
  return JSON.stringify({ type: 'tool_result', tool_use_id: toolUseId, content: output }) + '\n';
}

export function claudeThinking(text: string): string {
  return JSON.stringify({ type: 'thinking', content: text }) + '\n';
}

export function claudeResult(sessionId: string, text?: string, cost?: Record<string, unknown>): string {
  const obj: Record<string, unknown> = { type: 'result', subtype: 'success', session_id: sessionId };
  if (text !== undefined) obj['result'] = text;
  if (cost !== undefined) obj['cost'] = cost;
  return JSON.stringify(obj) + '\n';
}

export function claudeError(message: string): string {
  return JSON.stringify({ type: 'error', message }) + '\n';
}

// ---------------------------------------------------------------------------
// Codex JSONL
// ---------------------------------------------------------------------------

export function codexMessage(text: string): string {
  return JSON.stringify({ type: 'message', content: text }) + '\n';
}

export function codexFunctionCall(call: ToolCall): string {
  return JSON.stringify({
    type: 'function_call',
    id: call.id,
    call_id: call.id,
    name: call.name,
    arguments: JSON.stringify(call.input ?? {}),
  }) + '\n';
}

export function codexFunctionCallOutput(callId: string, output: string): string {
  return JSON.stringify({ type: 'function_call_output', call_id: callId, output }) + '\n';
}

export function codexError(message: string): string {
  return JSON.stringify({ type: 'error', message }) + '\n';
}

// ---------------------------------------------------------------------------
// Gemini / generic JSONL
// ---------------------------------------------------------------------------

export function geminiText(text: string): string {
  return JSON.stringify({ type: 'text', content: text }) + '\n';
}

export function geminiToolCall(call: ToolCall): string {
  return JSON.stringify({ type: 'tool_call', id: call.id, name: call.name, args: call.input ?? {} }) + '\n';
}

export function geminiToolResult(id: string, output: string): string {
  return JSON.stringify({ type: 'tool_result', id, output }) + '\n';
}

export function geminiError(message: string): string {
  return JSON.stringify({ type: 'error', message }) + '\n';
}

// ---------------------------------------------------------------------------
// Generic "type+content" (used by copilot/cursor/opencode/pi/omp/openclaw/hermes)
// ---------------------------------------------------------------------------

export function genericText(text: string): string {
  return JSON.stringify({ type: 'text', content: text }) + '\n';
}

export function genericToolCall(call: ToolCall): string {
  return JSON.stringify({ type: 'tool_call', id: call.id, name: call.name, input: call.input ?? {} }) + '\n';
}

export function genericError(message: string): string {
  return JSON.stringify({ type: 'error', message }) + '\n';
}

// ---------------------------------------------------------------------------
// OutputChunk helpers
// ---------------------------------------------------------------------------

/** Build a stdout chunk with optional delay. */
export function stdoutChunk(data: string, delayMs = 10): OutputChunk {
  return { stream: 'stdout', data, delayMs };
}

/** Build a stderr chunk with optional delay. */
export function stderrChunk(data: string, delayMs = 10): OutputChunk {
  return { stream: 'stderr', data, delayMs };
}
