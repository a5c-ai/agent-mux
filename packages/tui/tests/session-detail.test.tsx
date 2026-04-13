import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { SessionDetailView } from '../src/plugins/session-detail-view.js';
import { EventStream } from '../src/event-stream.js';

const flush = () => new Promise((r) => setTimeout(r, 20));

function makeClient(opts: { get?: unknown; export?: unknown } = {}) {
  return {
    sessions: {
      get: vi.fn().mockResolvedValue(
        opts.get ?? {
          sessionId: 's1',
          turnCount: 4,
          totalCost: 0.1234,
          createdAt: '2026-04-13T00:00:00Z',
          title: 'demo',
        },
      ),
      export: vi.fn().mockResolvedValue(opts.export ?? '{"ok":true}'),
    },
  } as never;
}

describe('SessionDetailView', () => {
  it('shows loading then renders metadata', async () => {
    const client = makeClient();
    const stream = new EventStream();
    const { lastFrame, rerender } = render(
      <SessionDetailView
        client={client}
        active={true}
        eventStream={stream}
        emit={() => {}}
        selection={{ agent: 'claude-code', sessionId: 's1' }}
      />,
    );
    expect(lastFrame()).toContain('Loading');
    await flush();
    rerender(
      <SessionDetailView
        client={client}
        active={true}
        eventStream={stream}
        emit={() => {}}
        selection={{ agent: 'claude-code', sessionId: 's1' }}
      />,
    );
    const f = lastFrame() ?? '';
    expect(f).toContain('claude-code');
    expect(f).toContain('s1');
    expect(f).toContain('turns: 4');
    expect(f).toContain('$0.1234');
    expect(f).toContain('demo');
  });

  it('shows hint when no selection', () => {
    const client = makeClient();
    const stream = new EventStream();
    const { lastFrame } = render(
      <SessionDetailView
        client={client}
        active={true}
        eventStream={stream}
        emit={() => {}}
      />,
    );
    expect(lastFrame()).toContain('No session selected');
  });

  it('e key triggers export json and emits status', async () => {
    const client = makeClient();
    const stream = new EventStream();
    const emit = vi.fn();
    const { stdin, rerender } = render(
      <SessionDetailView
        client={client}
        active={true}
        eventStream={stream}
        emit={emit}
        selection={{ agent: 'claude-code', sessionId: 's1' }}
      />,
    );
    await flush();
    rerender(
      <SessionDetailView
        client={client}
        active={true}
        eventStream={stream}
        emit={emit}
        selection={{ agent: 'claude-code', sessionId: 's1' }}
      />,
    );
    stdin.write('e');
    await flush();
    expect(client.sessions.export).toHaveBeenCalledWith('claude-code', 's1', 'json');
    const statusCall = emit.mock.calls.find((c) => c[0]?.type === 'status');
    expect(statusCall?.[0]?.message).toMatch(/Exported json/);
  });

  it('Esc emits view:switch back to sessions', async () => {
    const client = makeClient();
    const stream = new EventStream();
    const emit = vi.fn();
    const { stdin, rerender } = render(
      <SessionDetailView
        client={client}
        active={true}
        eventStream={stream}
        emit={emit}
        selection={{ agent: 'claude-code', sessionId: 's1' }}
      />,
    );
    await flush();
    rerender(
      <SessionDetailView
        client={client}
        active={true}
        eventStream={stream}
        emit={emit}
        selection={{ agent: 'claude-code', sessionId: 's1' }}
      />,
    );
    stdin.write('\u001B');
    await new Promise((r) => setTimeout(r, 60));
    const sw = emit.mock.calls.find((c) => c[0]?.type === 'view:switch');
    expect(sw?.[0]?.id).toBe('sessions');
  });
});
