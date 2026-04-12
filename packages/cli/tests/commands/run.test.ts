import { describe, it, expect } from 'vitest';
import { validateRunFlags, buildRunOptions, RUN_FLAGS } from '../../src/commands/run.js';
import { parseArgs } from '../../src/parse-args.js';

describe('validateRunFlags', () => {
  it('returns null for valid flag combinations', () => {
    expect(validateRunFlags({ yolo: true })).toBeNull();
    expect(validateRunFlags({ deny: true })).toBeNull();
    expect(validateRunFlags({ stream: true })).toBeNull();
    expect(validateRunFlags({})).toBeNull();
  });

  it('rejects --session + --no-session', () => {
    const result = validateRunFlags({ session: 'abc', 'no-session': true });
    expect(result).toContain('--session');
    expect(result).toContain('--no-session');
  });

  it('rejects --session + --fork', () => {
    const result = validateRunFlags({ session: 'abc', fork: 'def' });
    expect(result).toContain('--session');
    expect(result).toContain('--fork');
  });

  it('rejects --fork + --no-session', () => {
    const result = validateRunFlags({ fork: 'abc', 'no-session': true });
    expect(result).toContain('--fork');
    expect(result).toContain('--no-session');
  });

  it('rejects --yolo + --deny', () => {
    const result = validateRunFlags({ yolo: true, deny: true });
    expect(result).toContain('--yolo');
    expect(result).toContain('--deny');
  });

  it('rejects --stream + --no-stream', () => {
    const result = validateRunFlags({ stream: true, 'no-stream': true });
    expect(result).toContain('--stream');
    expect(result).toContain('--no-stream');
  });
});

describe('buildRunOptions', () => {
  const agents = new Set(['claude', 'codex', 'gemini']);

  it('resolves agent from first positional when it matches a known agent', () => {
    const args = parseArgs(['run', 'claude', 'hello world'], RUN_FLAGS);
    const result = buildRunOptions(args, agents);
    expect(result.agent).toBe('claude');
    expect(result.prompt).toBe('hello world');
  });

  it('treats first positional as prompt when it does not match an agent', () => {
    const args = parseArgs(['run', 'explain this code'], RUN_FLAGS);
    const result = buildRunOptions(args, agents);
    expect(result.agent).toBeUndefined();
    expect(result.prompt).toBe('explain this code');
  });

  it('uses --agent flag for agent', () => {
    const args = parseArgs(['run', '--agent', 'claude', 'hello'], RUN_FLAGS);
    const result = buildRunOptions(args, agents);
    expect(result.agent).toBe('claude');
    expect(result.prompt).toBe('hello');
  });

  it('maps --yolo to approvalMode', () => {
    const args = parseArgs(['run', '--yolo'], RUN_FLAGS);
    const result = buildRunOptions(args, agents);
    expect(result.options['approvalMode']).toBe('yolo');
  });

  it('maps --deny to approvalMode', () => {
    const args = parseArgs(['run', '--deny'], RUN_FLAGS);
    const result = buildRunOptions(args, agents);
    expect(result.options['approvalMode']).toBe('deny');
  });

  it('maps --no-stream to stream: false', () => {
    const args = parseArgs(['run', '--no-stream'], RUN_FLAGS);
    const result = buildRunOptions(args, agents);
    expect(result.options['stream']).toBe(false);
  });

  it('maps --stream to stream: true', () => {
    const args = parseArgs(['run', '--stream'], RUN_FLAGS);
    const result = buildRunOptions(args, agents);
    expect(result.options['stream']).toBe(true);
  });

  it('maps --thinking-effort', () => {
    const args = parseArgs(['run', '--thinking-effort', 'high'], RUN_FLAGS);
    const result = buildRunOptions(args, agents);
    expect(result.options['thinkingEffort']).toBe('high');
  });

  it('maps --session', () => {
    const args = parseArgs(['run', '--session', 'abc123'], RUN_FLAGS);
    const result = buildRunOptions(args, agents);
    expect(result.options['sessionId']).toBe('abc123');
  });

  it('maps --no-session', () => {
    const args = parseArgs(['run', '--no-session'], RUN_FLAGS);
    const result = buildRunOptions(args, agents);
    expect(result.options['noSession']).toBe(true);
  });

  it('maps --timeout', () => {
    const args = parseArgs(['run', '--timeout', '30000'], RUN_FLAGS);
    const result = buildRunOptions(args, agents);
    expect(result.options['timeout']).toBe(30000);
  });

  it('maps --tag as array', () => {
    const args = parseArgs(['run', '--tag', 'build', '--tag', 'test'], RUN_FLAGS);
    const result = buildRunOptions(args, agents);
    expect(result.options['tags']).toEqual(['build', 'test']);
  });

  it('maps --env KEY=VALUE pairs', () => {
    const args = parseArgs(['run', '--env', 'FOO=bar', '--env', 'BAZ=qux'], RUN_FLAGS);
    const result = buildRunOptions(args, agents);
    expect(result.options['env']).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('maps --max-output-tokens over --max-tokens', () => {
    const args = parseArgs(['run', '--max-tokens', '1000', '--max-output-tokens', '2000'], RUN_FLAGS);
    const result = buildRunOptions(args, agents);
    expect(result.options['maxOutputTokens']).toBe(2000);
  });

  it('maps --model', () => {
    const args = parseArgs(['run', '--model', 'claude-sonnet-4-20250514'], RUN_FLAGS);
    const result = buildRunOptions(args, agents);
    expect(result.options['model']).toBe('claude-sonnet-4-20250514');
  });

  it('strips undefined options', () => {
    const args = parseArgs(['run', 'claude', 'hello'], RUN_FLAGS);
    const result = buildRunOptions(args, agents);
    expect(Object.prototype.hasOwnProperty.call(result.options, 'temperature')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result.options, 'topP')).toBe(false);
  });
});
