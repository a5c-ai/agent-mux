# @a5c-ai/agent-mux-harness-mock

Mock harness simulator for [agent-mux](https://github.com/a5c-ai/agent-mux) adapter testing. Replays recorded/synthesized `claude-code`, `codex`, and other harness output streams so you can develop and test adapters without hitting real APIs.

## Install

```bash
npm install --save-dev @a5c-ai/agent-mux-harness-mock
```

Requires Node.js >= 20.9.0.

## CLI

```bash
mock-harness --list
mock-harness --scenario claude-code-simple
```

## Programmatic

```ts
import { createMockProcess, scenarios } from '@a5c-ai/agent-mux-harness-mock';

const proc = createMockProcess(scenarios['claude-code-simple']);
```

See the [repository README](https://github.com/a5c-ai/agent-mux#readme) for details.

## License

MIT © a5c-ai
