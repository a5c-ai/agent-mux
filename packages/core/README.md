# @a5c-ai/agent-mux-core

Core types, client, and stream engine for [agent-mux](https://github.com/a5c-ai/agent-mux).

Provides the `AgentMuxClient`, the normalized `AgentEvent` stream, adapter contracts, atomic filesystem helpers, authentication managers, and the session/run machinery that every adapter depends on.

## Install

```bash
npm install @a5c-ai/agent-mux-core
```

Requires Node.js >= 20.9.0. ESM-only.

## Usage

```ts
import { AgentMuxClient, defaultRegistry } from '@a5c-ai/agent-mux-core';
```

See the [repository README](https://github.com/a5c-ai/agent-mux#readme) for full documentation.

## License

MIT © a5c-ai
