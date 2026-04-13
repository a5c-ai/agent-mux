import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { EventStream } from '../src/event-stream.js';
import RunsViewPlugin from '../src/plugins/runs-view.js';
import type { AgentEvent } from '@a5c-ai/agent-mux';

function extract() {
  const views: { component: React.ComponentType<unknown> }[] = [];
  RunsViewPlugin.register({
    client: {} as never,
    eventStream: new EventStream(),
    registerView: (v) => views.push(v as never),
    registerEventRenderer: () => {},
    registerCommand: () => {},
    registerPromptHandler: () => {},
    emit: () => {},
  });
  return views[0]!.component as React.ComponentType<{
    client: unknown;
    active: boolean;
    eventStream: EventStream;
    emit: () => void;
  }>;
}

const ev = (e: object): AgentEvent => ({ runId: 'r1', agent: 'claude-code', timestamp: '2026-04-13T00:00:00Z', ...e }) as AgentEvent;
const flush = () => new Promise((r) => setTimeout(r, 10));

describe('runs-view', () => {
  it('shows empty state initially', () => {
    const View = extract();
    const stream = new EventStream();
    const { lastFrame } = render(<View client={{}} active={true} eventStream={stream} emit={() => {}} />);
    expect(lastFrame()).toContain('No runs observed');
  });

  it('derives runs from stream events with status transitions and cost totals', async () => {
    const View = extract();
    const stream = new EventStream();
    const { lastFrame, rerender } = render(<View client={{}} active={true} eventStream={stream} emit={() => {}} />);
    stream.push(ev({ type: 'session_start', sessionId: 'sess1', resumed: false }));
    stream.push(ev({ type: 'cost', cost: { totalUsd: 0.05 } }));
    stream.push(ev({ type: 'cost', cost: { totalUsd: 0.07 } }));
    stream.push(ev({ runId: 'r2', type: 'session_start', sessionId: 'sess2', resumed: false }));
    stream.push(ev({ type: 'session_end', sessionId: 'sess1', turnCount: 3 }));
    await flush();
    rerender(<View client={{}} active={true} eventStream={stream} emit={() => {}} />);
    const f = lastFrame() ?? '';
    expect(f).toContain('completed');
    expect(f).toContain('active');
    expect(f).toContain('claude-code');
    expect(f).toMatch(/\$0\.1200/); // 0.05 + 0.07
  });
});
