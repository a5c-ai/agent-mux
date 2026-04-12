/**
 * Hook payload fixtures — deterministic JSON payloads that each harness
 * would send to a hook script on stdin. Useful in tests for driving
 * parseHookPayload, HookDispatcher, and `amux hooks handle` end-to-end.
 */

export interface HookPayloadFixture {
  agent: string;
  hookType: string;
  payload: Record<string, unknown>;
}

export const HOOK_PAYLOAD_FIXTURES: HookPayloadFixture[] = [
  {
    agent: 'claude',
    hookType: 'PreToolUse',
    payload: {
      session_id: 'sess-claude-1',
      transcript_path: '/tmp/t.jsonl',
      cwd: '/work/proj',
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
    },
  },
  {
    agent: 'claude',
    hookType: 'PostToolUse',
    payload: {
      session_id: 'sess-claude-1',
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
      tool_output: 'file.txt\n',
    },
  },
  {
    agent: 'claude',
    hookType: 'Stop',
    payload: { session_id: 'sess-claude-1' },
  },
  {
    agent: 'codex',
    hookType: 'OnToolCall',
    payload: {
      session_id: 'sess-codex-1',
      tool_name: 'apply_patch',
      tool_input: { path: 'a.txt' },
    },
  },
  {
    agent: 'codex',
    hookType: 'OnStop',
    payload: { session_id: 'sess-codex-1' },
  },
  {
    agent: 'gemini',
    hookType: 'pre_prompt',
    payload: { session_id: 'g-1', prompt: 'hello' },
  },
  {
    agent: 'copilot',
    hookType: 'preTool',
    payload: { session_id: 'co-1', tool_name: 'edit' },
  },
];

export function getHookFixture(agent: string, hookType: string): HookPayloadFixture | undefined {
  return HOOK_PAYLOAD_FIXTURES.find((f) => f.agent === agent && f.hookType === hookType);
}
