# agent-mux

`@a5c-ai/agent-mux` is a unified TypeScript SDK and CLI (`amux`) for driving heterogeneous coding-agent harnesses — Claude Code, Codex, Gemini, Copilot, Cursor, OpenCode, pi, omp, openclaw, hermes, qwen — through one contract.

It spawns real subprocesses, normalizes their streaming output into a shared `AgentEvent` stream, and exposes each harness's sessions, config, auth, and plugins through a single `AgentMuxClient` interface. Invocations can run locally, in Docker, over SSH, or in a Kubernetes pod with no code change.

## Install

```bash
# SDK + CLI
npm install @a5c-ai/agent-mux

# SDK only
npm install @a5c-ai/agent-mux-core @a5c-ai/agent-mux-adapters

# Zero-install CLI
npx @a5c-ai/agent-mux --help
```

Requires Node.js 20.9.0 or later. ESM-first, with a CJS compatibility shim.

## Quickstart

```bash
# Run a prompt against a harness you have installed locally
amux run --agent claude-code --prompt "Summarize README.md"

# Streaming JSON events (one per line)
amux run --agent codex --prompt "Add a test for foo()" --json

# Pick a profile (named RunOptions preset)
amux run --profile fast-claude --prompt "..."
```

SDK:

```ts
import { createClient } from '@a5c-ai/agent-mux';

const client = createClient();
const handle = client.run({ agent: 'claude-code', prompt: 'hello' });

for await (const event of handle.events()) {
  if (event.type === 'text_delta') process.stdout.write(event.text);
}
await handle.done;
```

## Supported agents

| Agent | CLI | Session dir |
|---|---|---|
| `claude` / `claude-code` | `claude` | `~/.claude/projects` |
| `codex` | `codex` | `~/.codex/sessions` |
| `gemini` | `gemini` | `~/.gemini/sessions` |
| `copilot` | `gh copilot` | `~/.config/github-copilot/sessions` |
| `cursor` | `cursor-agent` | `~/.cursor/sessions` |
| `opencode` | `opencode` | `~/.local/share/opencode` |
| `pi` | `pi` | `~/.pi/agent/sessions` |
| `omp` | `omp` | `~/.omp/agent/sessions` |
| `openclaw` | `openclaw` | `~/.openclaw/sessions` |
| `hermes` | `hermes` | `~/.hermes/sessions` |
| `qwen` | `qwen` | `~/.qwen/sessions` |
| `agent-mux-remote` | `amux` | (transport-delegated) |

Install or update any of them through `amux`:

```bash
amux install claude-code          # npm / brew / manual, adapter-specified
amux update codex
amux detect --all --json          # probe installations
amux detect-host                  # is this shell already inside a harness?
```

## Invocation modes

A single `RunOptions.invocation` (or CLI `--mode`) picks where the harness runs:

```ts
client.run({ agent: 'claude-code', prompt: '...', invocation: { mode: 'local' } });
client.run({ agent: 'codex', prompt: '...', invocation: {
  mode: 'docker', image: 'ghcr.io/openai/codex', volumes: ['/cache:/cache'],
}});
client.run({ agent: 'claude-code', prompt: '...', invocation: {
  mode: 'ssh', host: 'user@builder', identityFile: '~/.ssh/id_ed25519',
}});
client.run({ agent: 'gemini', prompt: '...', invocation: {
  mode: 'k8s', namespace: 'runners', image: 'ghcr.io/google/gemini-cli',
}});
```

Remote bootstrap (installs `amux` + harness on the target, then verifies):

```bash
amux remote install builder.example.com --harness claude-code
amux remote update  builder.example.com --harness codex --mode ssh
```

See [docs/13-invocation-modes.md](docs/13-invocation-modes.md).

## Docker

The repository ships a `Dockerfile` that builds an image with one or more harnesses pre-installed via `amux install`:

```bash
docker build --build-arg HARNESSES=claude-code,codex -t amux .
docker run --rm -it -v "$PWD:/workspace" amux run --agent claude-code --prompt '...'
```

## Testing with harness-mock

`@a5c-ai/agent-mux-harness-mock` simulates harness subprocesses with no real binary, API key, or network. Use it for deterministic adapter tests.

```ts
import { MockProcess, claudeCodeSuccess, WorkspaceSandbox } from '@a5c-ai/agent-mux-harness-mock';

const sandbox = new WorkspaceSandbox();
const proc = new MockProcess(claudeCodeSuccess);
// Drive proc.stdout / stdin; apply scenario.fileOperations against sandbox.
```

See [docs/14-harness-mock.md](docs/14-harness-mock.md).

## Contributing

- `npm install` at the repo root.
- `npm run build` — TypeScript build across all workspaces.
- `npm test` — vitest unit tests. `npm run test:e2e` — end-to-end suite.
- `npm run lint` — ESLint with a local `max-file-lines` rule (400 effective lines).
- `npm run hooks:install` — wires `.githooks/pre-commit`, which runs build + lint + tests on staged changes.

Specs live in [docs/](docs/) (numbered 01–14); they are the source of truth for API shape and behavior. File a PR with spec updates alongside code changes.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the manual publish / version-bump flow.

## Packages

This repo is an npm workspaces monorepo. Each published package has its own README:

- [`@a5c-ai/agent-mux`](packages/agent-mux/README.md) — meta-package (SDK + CLI convenience install).
- [`@a5c-ai/agent-mux-core`](packages/core/README.md) — core types, client, stream engine.
- [`@a5c-ai/agent-mux-adapters`](packages/adapters/README.md) — built-in harness adapters.
- [`@a5c-ai/agent-mux-cli`](packages/cli/README.md) — the `amux` command-line binary.
- [`@a5c-ai/agent-mux-harness-mock`](packages/harness-mock/README.md) — mock harness simulator for tests.

License: MIT.
