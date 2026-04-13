import React from 'react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import SkillsPlugin from '../src/plugins/skills-view.js';
import AgentsPlugin from '../src/plugins/agents-view.js';
import { EventStream } from '../src/event-stream.js';
import type { TuiPlugin } from '../src/plugin.js';

function extract(plugin: TuiPlugin) {
  const views: { component: React.ComponentType<unknown> }[] = [];
  plugin.register({
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

let tmp: string;
let prevCwd: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'amux-view-'));
  prevCwd = process.cwd();
  process.chdir(tmp);
});
afterEach(() => {
  process.chdir(prevCwd);
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('skills-view', () => {
  it('lists installed project skills', async () => {
    fs.mkdirSync(path.join(tmp, '.claude', 'skills', 'foo'), { recursive: true });
    const View = extract(SkillsPlugin);
    const stream = new EventStream();
    const { lastFrame, rerender } = render(<View client={{} as never} active={true} eventStream={stream} emit={() => {}} />);
    await new Promise((r) => setTimeout(r, 20));
    rerender(<View client={{} as never} active={true} eventStream={stream} emit={() => {}} />);
    const f = lastFrame() ?? '';
    expect(f).toContain('Skills');
    expect(f).toContain('claude');
    expect(f).toContain('foo');
  });

});

describe('agents-view', () => {
  it('lists installed project sub-agents', async () => {
    fs.mkdirSync(path.join(tmp, '.claude', 'agents'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.claude', 'agents', 'bar.md'), 'x');
    const View = extract(AgentsPlugin);
    const stream = new EventStream();
    const { lastFrame, rerender } = render(<View client={{} as never} active={true} eventStream={stream} emit={() => {}} />);
    await new Promise((r) => setTimeout(r, 20));
    rerender(<View client={{} as never} active={true} eventStream={stream} emit={() => {}} />);
    const f = lastFrame() ?? '';
    expect(f).toContain('Sub-agents');
    expect(f).toContain('claude');
    expect(f).toContain('bar.md');
  });

  it('deletes selected sub-agent on d + y', async () => {
    const file = path.join(tmp, '.claude', 'agents', 'zap.md');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'x');
    const View = extract(AgentsPlugin);
    const stream = new EventStream();
    const { stdin, rerender } = render(<View client={{} as never} active={true} eventStream={stream} emit={() => {}} />);
    await new Promise((r) => setTimeout(r, 20));
    rerender(<View client={{} as never} active={true} eventStream={stream} emit={() => {}} />);
    stdin.write('d');
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('y');
    await new Promise((r) => setTimeout(r, 20));
    expect(fs.existsSync(file)).toBe(false);
  });
});
