import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import HelpPlugin from '../src/plugins/help-view.js';
import { EventStream } from '../src/event-stream.js';

function extract() {
  const views: { component: React.ComponentType<unknown> }[] = [];
  HelpPlugin.register({
    client: { adapters: { list: () => [{ agent: 'claude-code' }, { agent: 'codex' }] } } as never,
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

describe('help-view', () => {
  it('lists global keybindings and discovered agents', () => {
    const View = extract();
    const stream = new EventStream();
    const client = {
      adapters: { list: () => [{ agent: 'claude-code' }, { agent: 'codex' }] },
    } as never;
    const { lastFrame } = render(<View client={client} active={true} eventStream={stream} emit={() => {}} />);
    const f = lastFrame() ?? '';
    expect(f).toContain('Keybindings');
    expect(f).toContain('open prompt input');
    expect(f).toContain('claude-code');
    expect(f).toContain('codex');
    expect(f).toContain('AMUX_TUI_COST_ALERT');
  });
});
