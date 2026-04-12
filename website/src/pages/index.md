---
title: agent-mux
hide_table_of_contents: true
---

# agent-mux

**One client, every coding agent.** Drive Claude Code, Codex, Gemini, Cursor, OpenCode, Copilot, and more from a single streaming API — locally, in Docker, or in Kubernetes.

- Unified `RunOptions` and `AgentEvent` model across 11 adapters
- Session save/resume, hooks, and MCP plugin management
- Mock harness for deterministic tests
- Multi-agent dispatch and remote invocation

## Get started

Head to **[Getting Started](/docs/tutorials/getting-started)** to install the package and run your first agent in under a minute.

```bash
npm install -g @a5c-ai/agent-mux
amux detect
amux run claude --prompt "Hello, agent-mux"
```

## Features

- **Unified event stream** — JSONL/SSE/stream-json/ANSI are normalized to one `AgentEvent` union.
- **Sessions** — list, read, resume, fork, and watch across `~/.claude/projects`, `~/.codex/sessions`, etc.
- **Invocation modes** — `local`, `docker`, `ssh`, and `k8s` share the same adapter contract.
- **Hooks** — `amux hooks install` wires native settings or a virtual event-stream layer.
- **MCP plugins** — install/list/uninstall MCP servers across claude/codex/gemini/cursor/opencode.
- **Auth & install detection** — `amux doctor`, `amux detect --all --json`, `amux install`.
- **Capabilities & models** — every adapter declares capability + model metadata.
- **Cost tracking** — `cost` events + `sumCost(events)` helper.
- **Profiles** — `amux run --profile fast-claude`.
- **Mock harness** — deterministic scenarios without real binaries or keys.
- **Remote bootstrap** — `amux remote install <host> --harness claude`.

## SDK examples

```ts
import { createClient, sumCost } from '@a5c-ai/agent-mux';

const handle = createClient().run({ agent: 'claude-code', prompt: 'Refactor src/api.ts to use async/await' });

for await (const ev of handle.events()) {
  if (ev.type === 'text_delta') process.stdout.write(ev.delta);
  if (ev.type === 'cost') process.stdout.write(`\n$${ev.cost.totalUsd?.toFixed(4)}`);
}

// Later: sum cost across a stored session
const sessions = createClient().sessions('claude-code');
const [last] = await sessions.list();
const { events } = await sessions.read(last.sessionId);
console.log(sumCost(events).totalUsd);
```

## Learn more

- [Adapter pages](/docs/category/agents) — per-agent install, auth, flags, and limits
- [Invocation Modes](/docs/invocation-modes) — docker, k8s, ssh
- [Hooks](/docs/tutorials/hooks) and [Plugins](/docs/tutorials/plugins)
- [Multi-agent dispatch](/docs/tutorials/multi-agent)
- [Sessions](/docs/tutorials/sessions) and [Remote bootstrap](/docs/tutorials/remote-bootstrap)
