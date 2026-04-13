# @a5c-ai/agent-mux-tui

Ink-based TUI for agent-mux with a plugin-first architecture. Almost everything
(message renderers, tool-call cards, diff views, session manager, chat) ships
as a plugin. The host package only provides the Ink process, view router, and
the SDK-injected `TuiContext`.

## Install

```bash
npm i -g @a5c-ai/agent-mux-tui
amux-tui
```

## Writing a plugin

```ts
import { definePlugin } from '@a5c-ai/agent-mux-tui/plugin';
import { Text } from 'ink';
import React from 'react';

export default definePlugin({
  name: 'my-error-renderer',
  register(ctx) {
    ctx.registerEventRenderer({
      id: 'error',
      match: (ev) => ev.type === 'error',
      component: ({ event }) =>
        event.type === 'error' ? <Text color="red">{event.message}</Text> : null,
    });
  },
});
```

Pass your plugins to `App`:

```tsx
import { render } from 'ink';
import { App, builtinPlugins } from '@a5c-ai/agent-mux-tui';
import myPlugin from './my-plugin.js';

render(<App client={client} plugins={[...builtinPlugins, myPlugin]} />);
```

## Extension points

- `registerView` — top-level tab in the TUI (chat, sessions, config, …)
- `registerEventRenderer` — per-`AgentEvent` display component. The renderer
  with `id: 'fallback'` is reserved for the built-in dim one-liner that
  handles any unrecognized event type; other renderers take priority.
- `registerCommand` — global hotkey command
- `registerPromptHandler` — overrides the default `p` prompt dispatch. If any
  plugin registers a prompt handler, it receives the prompt instead of
  `client.run({ agent: defaultAgent, prompt })`.

All extension points get an injected `TuiContext` with:
- `client: AgentMuxClient` — the SDK client instance
- `eventStream: EventStream` — shared pub/sub of `AgentEvent`s. Views
  subscribe to render streaming output; commands can push synthetic events
  via `ctx.emit({ type: 'event', event })`.

## Running a prompt

Press `p` to open the prompt input, type your message, and press Enter.
Events from the resulting `client.run()` are pushed into the shared
`EventStream` and rendered by `chat-view` in registration-priority order
(specific renderers before the fallback).

The built-in plugins (`text-delta`, `thinking-delta`, `tool-call`,
`tool-error`, `cost`, `chat-view`, `sessions-view`, `fallback`) are all
implemented through these same extension points — use them as references.

## View hotkeys

| Key | View       | Purpose                                       |
|-----|------------|-----------------------------------------------|
| `1` | chat       | streaming run output + filter                 |
| `2` | sessions   | session list (press `d` to inspect + export)  |
| `3` | cost       | cost/usage summary                            |
| `4` | adapters   | discovered adapters                           |
| `5` | models     | model registry per adapter                    |
| `6` | profiles   | run-options profiles                          |
| `7` | plugins    | native plugins per adapter                    |
| `8` | runs       | active/recent runs                            |
| `9` | help       | keybindings + tips                            |
| `0` | mcp        | registered MCP servers                        |
| `-` | doctor     | capability matrix / diagnostics               |
| `a` | auth       | auth status per adapter                       |
| `c` | config     | config view                                   |
| `k` | skills     | installed skills (d: delete, r: refresh)      |
| `g` | agents     | installed sub-agents (d: delete, r: refresh)  |
| `h` | hooks      | registered hooks (d: remove, r: refresh)      |

Global: `p` prompt, `/` filter, `:` / Ctrl-K palette, `m` model picker,
`P` profile picker, `i` interrupt, `y`/`n` approval, `q` quit.
