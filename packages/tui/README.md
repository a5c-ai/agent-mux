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
- `registerEventRenderer` — per-`AgentEvent` display component
- `registerCommand` — global hotkey command

The built-in plugins (`text-delta`, `tool-call`, `cost`, `chat-view`,
`sessions-view`) are all implemented through these same extension points — use
them as references.
