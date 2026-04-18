import type { HarnessScenario, HarnessType } from '../types.js';
import {
  agentCost,
  agentMessageStop,
  agentTextDelta,
  agentToolCallReady,
  agentToolCallStart,
  agentToolResult,
  claudeMessageStop,
  claudeResult,
  claudeStreamEventText,
  claudeStreamEventThinking,
  claudeSystemInit,
  claudeToolResult,
  claudeToolUse,
  codexItemCompleted,
  codexItemStarted,
  codexThreadStarted,
  codexTurnCompleted,
  codexTurnFailed,
  codexTurnStarted,
  geminiText,
  geminiToolCall,
  geminiToolResult,
  genericError,
  genericSessionEnd,
  genericSessionStart,
  genericText,
  genericToolCall,
  stdoutChunk,
} from './wire-format.js';

export interface HarnessScenarioProfile {
  harnessKey: string;
  harness: HarnessType;
  executionType: 'subprocess';
  scenarios: string[];
  notes: string;
}

function scenario(
  harness: HarnessScenario['harness'],
  name: string,
  output: HarnessScenario['output'],
  process: HarnessScenario['process'] = { exitCode: 0 },
): HarnessScenario {
  return {
    harness,
    executionType: 'subprocess',
    name,
    process,
    output,
  };
}

function genericPair(
  harness: HarnessScenario['harness'],
  label: string,
  opts: { session?: boolean; plainText?: boolean; tool?: boolean } = {},
): HarnessScenario[] {
  const basicOutput = opts.plainText
    ? [stdoutChunk(`Hello from ${label}.\n`, 5)]
    : [
      ...(opts.session ? [stdoutChunk(genericSessionStart(`${label}-session`), 5)] : []),
      stdoutChunk(genericText(`Hello from ${label}.`), 10),
      ...(opts.session ? [stdoutChunk(genericSessionEnd(`Done from ${label}.`), 10)] : []),
    ];

  const toolOutput = opts.tool === false
    ? [stdoutChunk(genericError(`${label} does not support tools in this mode.`), 10)]
    : [
      ...(opts.session ? [stdoutChunk(genericSessionStart(`${label}-tool-session`), 5)] : []),
      stdoutChunk(genericText(`${label} invoking tool.`), 10),
      stdoutChunk(genericToolCall({ id: `${label}-t1`, name: 'run', input: { path: '/tmp/input.txt' } }), 10),
    ];

  return [
    scenario(harness, `${label}:basic-text`, basicOutput),
    scenario(harness, `${label}:${opts.tool === false ? 'error' : 'tool-call'}`, toolOutput, opts.tool === false ? { exitCode: 1 } : { exitCode: 0 }),
  ];
}

const claudeScenarios: HarnessScenario[] = [
  scenario('claude-code', 'claude:stream-json', [
    stdoutChunk(claudeSystemInit('sess_claude_stream', ['Read', 'Write']), 5),
    stdoutChunk(claudeStreamEventThinking('I should inspect the workspace first.'), 10),
    stdoutChunk(claudeStreamEventText('Hello '), 10),
    stdoutChunk(claudeStreamEventText('from Claude Code.'), 10),
    stdoutChunk(claudeMessageStop(), 10),
    stdoutChunk(claudeResult('sess_claude_stream', 'Completed.', {
      total_usd: 0.0012,
      input_tokens: 120,
      output_tokens: 45,
      cache_creation_tokens: 10,
      cache_read_tokens: 20,
    }), 10),
  ]),
  scenario('claude-code', 'claude:tool-call', [
    stdoutChunk(claudeSystemInit('sess_claude_tool', ['Read']), 5),
    stdoutChunk(claudeStreamEventText('Reading the requested file.'), 10),
    stdoutChunk(claudeToolUse({ id: 'claude-tool-1', name: 'Read', input: { file_path: '/tmp/x.txt' } }), 10),
    stdoutChunk(claudeToolResult('claude-tool-1', 'file contents'), 10),
    stdoutChunk(claudeResult('sess_claude_tool', 'Done.'), 10),
  ]),
];

const codexScenarios: HarnessScenario[] = [
  scenario('codex', 'codex:exec-turn', [
    stdoutChunk(codexThreadStarted('thread_codex_exec'), 5),
    stdoutChunk(codexTurnStarted('turn_codex_exec'), 10),
    stdoutChunk(codexItemStarted({ id: 'msg_1', type: 'message', content: 'Planning the answer.' }), 10),
    stdoutChunk(codexItemCompleted({ id: 'msg_1', type: 'agent_message', text: 'Here is the answer.' }), 10),
    stdoutChunk(codexTurnCompleted('Completed', {
      total_usd: 0.0008,
      input_tokens: 90,
      output_tokens: 30,
    }), 10),
  ]),
  scenario('codex', 'codex:code-generation', [
    stdoutChunk(codexThreadStarted('thread_codex_codegen'), 5),
    stdoutChunk(codexTurnStarted('turn_codex_codegen'), 10),
    stdoutChunk(codexItemStarted({ id: 'call_1', type: 'function_call', name: 'apply_patch', arguments: { patch: '+const x = 1;' } }), 10),
    stdoutChunk(codexItemCompleted({ id: 'call_1', type: 'function_call', call_id: 'call_1', name: 'apply_patch', arguments: { patch: '+const x = 1;' } }), 10),
    stdoutChunk(codexItemCompleted({ id: 'out_1', type: 'function_call_output', call_id: 'call_1', name: 'apply_patch', output: 'patch applied' }), 10),
    stdoutChunk(codexTurnCompleted('Patch applied'), 10),
  ]),
  scenario('codex', 'codex:error', [
    stdoutChunk(codexTurnFailed('Codex failed to execute the turn.'), 10),
  ], { exitCode: 1 }),
];

const geminiScenarios: HarnessScenario[] = [
  scenario('gemini', 'gemini:thinking-stream', [
    stdoutChunk(JSON.stringify({ type: 'thinking', content: 'Evaluating options.' }) + '\n', 5),
    stdoutChunk(geminiText('Gemini says hi.'), 10),
    stdoutChunk(geminiText('Streaming piece by piece.'), 10),
  ]),
  scenario('gemini', 'gemini:tool-call', [
    stdoutChunk(geminiText('Calling a tool.'), 5),
    stdoutChunk(geminiToolCall({ id: 'g1', name: 'search', input: { q: 'agent mux' } }), 10),
    stdoutChunk(geminiToolResult('g1', 'search results'), 10),
  ]),
];

const copilotScenarios: HarnessScenario[] = [
  scenario('copilot', 'copilot:plain-text', [
    stdoutChunk('Suggested command: npm test\n', 5),
  ]),
  scenario('copilot', 'copilot:error', [
    stdoutChunk(genericError('Authentication required.'), 5),
  ], { exitCode: 1 }),
];

const cursorScenarios = genericPair('cursor', 'cursor');
const opencodeScenarios: HarnessScenario[] = [
  scenario('opencode', 'opencode:session', [
    stdoutChunk(genericSessionStart('opencode-session'), 5),
    stdoutChunk(genericText('OpenCode started.'), 10),
    stdoutChunk(genericSessionEnd('OpenCode finished.', {
      total_usd: 0.0015,
      input_tokens: 100,
      output_tokens: 35,
    }), 10),
  ]),
  scenario('opencode', 'opencode:tool-call', [
    stdoutChunk(genericSessionStart('opencode-tool'), 5),
    stdoutChunk(genericToolCall({ id: 'opencode-t1', name: 'write_file', input: { path: '/tmp/out.ts' } }), 10),
    stdoutChunk(JSON.stringify({ type: 'tool_result', id: 'opencode-t1', name: 'write_file', result: 'written', duration: 12 }) + '\n', 10),
    stdoutChunk(genericSessionEnd(), 10),
  ]),
];
const piScenarios = genericPair('pi', 'pi');
const ompScenarios = genericPair('omp', 'omp');
const openclawScenarios = genericPair('openclaw', 'openclaw');
const hermesScenarios = genericPair('hermes', 'hermes');

const ampScenarios: HarnessScenario[] = [
  scenario('amp', 'amp:session', [
    stdoutChunk(JSON.stringify({ type: 'session_start', sessionId: 'amp-session' }) + '\n', 5),
    stdoutChunk(agentTextDelta('Amp started.', 'Amp started.'), 10),
    stdoutChunk(agentCost(0.0011, 140, 55), 10),
    stdoutChunk(JSON.stringify({ type: 'session_end', sessionId: 'amp-session', reason: 'completed', turnCount: 1 }) + '\n', 10),
  ]),
  scenario('amp', 'amp:tool-call', [
    stdoutChunk(JSON.stringify({ type: 'session_start', sessionId: 'amp-tool-session' }) + '\n', 5),
    stdoutChunk(agentToolCallStart('amp-t1', 'grep_codebase', { pattern: 'MockProcess' }), 10),
    stdoutChunk(agentToolResult('amp-t1', 'grep_codebase', 'packages/harness-mock/src/mock-process.ts', 8), 10),
  ]),
];

const droidScenarios: HarnessScenario[] = [
  scenario('droid', 'droid:session', [
    stdoutChunk(JSON.stringify({ type: 'session_start', sessionId: 'droid-session' }) + '\n', 5),
    stdoutChunk(agentTextDelta('Droid started.', 'Droid started.'), 10),
    stdoutChunk(agentMessageStop('Finished.'), 10),
    stdoutChunk(agentCost(0.0021, 210, 88), 10),
  ]),
  scenario('droid', 'droid:tool-call', [
    stdoutChunk(JSON.stringify({ type: 'session_start', sessionId: 'droid-tool' }) + '\n', 5),
    stdoutChunk(agentToolCallStart('droid-t1', 'bash', { command: 'npm test' }), 10),
    stdoutChunk(agentToolCallReady('droid-t1', 'bash', { command: 'npm test' }), 10),
    stdoutChunk(agentToolResult('droid-t1', 'bash', 'tests passed', 42), 10),
  ]),
];

const qwenScenarios: HarnessScenario[] = [
  scenario('qwen', 'qwen:basic-text', [
    stdoutChunk(geminiText('Hello from qwen.'), 5),
  ]),
  scenario('qwen', 'qwen:tool-call', [
    stdoutChunk(geminiText('Using a tool.'), 5),
    stdoutChunk(geminiToolCall({ id: 'q1', name: 'read_file', input: { path: '/tmp/qwen.txt' } }), 10),
    stdoutChunk(geminiToolResult('q1', 'file contents'), 10),
  ]),
];

const ALL_SCENARIOS = [
  ...claudeScenarios,
  ...codexScenarios,
  ...geminiScenarios,
  ...copilotScenarios,
  ...cursorScenarios,
  ...opencodeScenarios,
  ...piScenarios,
  ...ompScenarios,
  ...openclawScenarios,
  ...hermesScenarios,
  ...ampScenarios,
  ...droidScenarios,
  ...qwenScenarios,
];

export const SUBPROCESS_HARNESS_PROFILES: Record<string, HarnessScenarioProfile> = {
  claude: {
    harnessKey: 'claude',
    harness: 'claude-code',
    executionType: 'subprocess',
    scenarios: claudeScenarios.map((entry) => entry.name!),
    notes: 'Claude Code stream-json output with session, thinking, tool, and result envelopes.',
  },
  codex: {
    harnessKey: 'codex',
    harness: 'codex',
    executionType: 'subprocess',
    scenarios: codexScenarios.map((entry) => entry.name!),
    notes: 'Codex exec JSON events including thread/turn/item envelopes.',
  },
  gemini: {
    harnessKey: 'gemini',
    harness: 'gemini',
    executionType: 'subprocess',
    scenarios: geminiScenarios.map((entry) => entry.name!),
    notes: 'Gemini CLI JSON event stream with thinking and tool events.',
  },
  copilot: {
    harnessKey: 'copilot',
    harness: 'copilot',
    executionType: 'subprocess',
    scenarios: copilotScenarios.map((entry) => entry.name!),
    notes: 'Copilot primarily emits plain text, with JSON error fallback coverage.',
  },
  cursor: {
    harnessKey: 'cursor',
    harness: 'cursor',
    executionType: 'subprocess',
    scenarios: cursorScenarios.map((entry) => entry.name!),
    notes: 'Cursor JSON text/tool fixtures.',
  },
  opencode: {
    harnessKey: 'opencode',
    harness: 'opencode',
    executionType: 'subprocess',
    scenarios: opencodeScenarios.map((entry) => entry.name!),
    notes: 'OpenCode session_start/session_end event envelopes and tool execution.',
  },
  pi: {
    harnessKey: 'pi',
    harness: 'pi',
    executionType: 'subprocess',
    scenarios: piScenarios.map((entry) => entry.name!),
    notes: 'Pi JSON text/tool fixtures.',
  },
  omp: {
    harnessKey: 'omp',
    harness: 'omp',
    executionType: 'subprocess',
    scenarios: ompScenarios.map((entry) => entry.name!),
    notes: 'OMP JSON text/tool fixtures.',
  },
  openclaw: {
    harnessKey: 'openclaw',
    harness: 'openclaw',
    executionType: 'subprocess',
    scenarios: openclawScenarios.map((entry) => entry.name!),
    notes: 'OpenClaw JSON text/tool fixtures.',
  },
  hermes: {
    harnessKey: 'hermes',
    harness: 'hermes',
    executionType: 'subprocess',
    scenarios: hermesScenarios.map((entry) => entry.name!),
    notes: 'Hermes JSON text/tool fixtures.',
  },
  amp: {
    harnessKey: 'amp',
    harness: 'amp',
    executionType: 'subprocess',
    scenarios: ampScenarios.map((entry) => entry.name!),
    notes: 'Amp-specific session, cost, and tool-call events.',
  },
  droid: {
    harnessKey: 'droid',
    harness: 'droid',
    executionType: 'subprocess',
    scenarios: droidScenarios.map((entry) => entry.name!),
    notes: 'Droid-specific session/tool ready/message stop events.',
  },
  qwen: {
    harnessKey: 'qwen',
    harness: 'qwen',
    executionType: 'subprocess',
    scenarios: qwenScenarios.map((entry) => entry.name!),
    notes: 'Qwen-compatible JSON text/tool fixtures matching adapter parse paths.',
  },
};

const LEGACY_ALIASES: Record<string, string> = {
  'claude:basic-text': 'claude:stream-json',
  'claude:multi-turn': 'claude:stream-json',
  'codex:basic-text': 'codex:exec-turn',
  'gemini:basic-text': 'gemini:thinking-stream',
  'gemini:streaming': 'gemini:thinking-stream',
};

const scenarioByName = Object.fromEntries(
  ALL_SCENARIOS.map((entry) => [entry.name!, entry] as const),
) as Record<string, HarnessScenario>;

export const AGENT_SCENARIOS: Record<string, HarnessScenario> = {
  ...scenarioByName,
  ...Object.fromEntries(
    Object.entries(LEGACY_ALIASES).map(([alias, target]) => [alias, scenarioByName[target]!]),
  ),
};
