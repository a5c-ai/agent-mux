import React from 'react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import HooksPlugin from '../src/plugins/hooks-view.js';
import { EventStream } from '../src/event-stream.js';

function extract() {
  const views: { component: React.ComponentType<unknown> }[] = [];
  HooksPlugin.register({
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
let prevHome: string | undefined;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'amux-hooks-'));
  prevCwd = process.cwd();
  prevHome = process.env.HOME;
  process.chdir(tmp);
  process.env.HOME = tmp;
  process.env.USERPROFILE = tmp;
});
afterEach(() => {
  process.chdir(prevCwd);
  if (prevHome === undefined) delete process.env.HOME;
  else process.env.HOME = prevHome;
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('hooks-view', () => {
  it('lists registered hooks', async () => {
    fs.mkdirSync(path.join(tmp, '.amux'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.amux', 'hooks.json'), JSON.stringify({
      version: 1,
      hooks: [
        { id: 'h1', agent: '*', hookType: 'PreToolUse', handler: 'builtin', target: 'noop', enabled: true },
      ],
    }));
    const View = extract();
    const stream = new EventStream();
    const { lastFrame, rerender } = render(<View client={{} as never} active={true} eventStream={stream} emit={() => {}} />);
    await new Promise((r) => setTimeout(r, 30));
    rerender(<View client={{} as never} active={true} eventStream={stream} emit={() => {}} />);
    const f = lastFrame() ?? '';
    expect(f).toContain('Hooks');
    expect(f).toContain('h1');
    expect(f).toContain('PreToolUse');
  });

  it('removes hook on d + y', async () => {
    const hooksPath = path.join(tmp, '.amux', 'hooks.json');
    fs.mkdirSync(path.dirname(hooksPath), { recursive: true });
    fs.writeFileSync(hooksPath, JSON.stringify({
      version: 1,
      hooks: [
        { id: 'h1', agent: '*', hookType: 'PreToolUse', handler: 'builtin', target: 'noop', enabled: true },
      ],
    }));
    const View = extract();
    const stream = new EventStream();
    const { stdin, rerender } = render(<View client={{} as never} active={true} eventStream={stream} emit={() => {}} />);
    await new Promise((r) => setTimeout(r, 30));
    rerender(<View client={{} as never} active={true} eventStream={stream} emit={() => {}} />);
    stdin.write('d');
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('y');
    await new Promise((r) => setTimeout(r, 50));
    const after = JSON.parse(fs.readFileSync(hooksPath, 'utf8')) as { hooks: unknown[] };
    expect(after.hooks.length).toBe(0);
  });
});
