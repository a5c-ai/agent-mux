# agent-mux docs

These are the numbered specs — source of truth for API and behavior. Start here before reading code.

## Index

| # | Doc | What it covers |
|---|---|---|
| 01 | [core-types-and-client.md](01-core-types-and-client.md) | `AgentMuxClient`, registry, core types |
| 02 | [run-options-and-profiles.md](02-run-options-and-profiles.md) | `RunOptions`, profiles, defaults |
| 03 | [run-handle-and-interaction.md](03-run-handle-and-interaction.md) | `RunHandle` API, stdin injection, cancel |
| 04 | [agent-events.md](04-agent-events.md) | The `AgentEvent` union, streaming contract |
| 05 | [adapter-system.md](05-adapter-system.md) | `BaseAgentAdapter`, per-adapter responsibilities |
| 06 | [capabilities-and-models.md](06-capabilities-and-models.md) | `AgentCapabilities`, `ModelCapabilities` |
| 07 | [session-manager.md](07-session-manager.md) | Session discovery, resume, fork |
| 08 | [config-and-auth.md](08-config-and-auth.md) | Config files, `detectAuth`, guidance |
| 09 | [plugin-manager.md](09-plugin-manager.md) | MCP plugins, install/list/uninstall |
| 10 | [cli-reference.md](10-cli-reference.md) | `amux` CLI commands |
| 11 | [process-lifecycle-and-platform.md](11-process-lifecycle-and-platform.md) | Spawn, cleanup, PTY, platform matrix |
| 12 | [built-in-adapters.md](12-built-in-adapters.md) | All 11 bundled adapters |
| 13 | [invocation-modes.md](13-invocation-modes.md) | `local`, `docker`, `kubernetes` |
| 14 | [harness-mock.md](14-harness-mock.md) | Mock harness package & scenarios |
| 15 | [hooks.md](15-hooks.md) | Hook system (native + virtual) |

## Quickstart

```bash
npm install @a5c-ai/agent-mux
npx amux detect --all
npx amux run claude --prompt "hello"
```

## Contributing

See [../CONTRIBUTING.md](../CONTRIBUTING.md).

## Features (summary)

- **Unified event stream** — every harness is normalized into the same `AgentEvent` union: `text_delta`, `thinking_delta`, `tool_call_start`/`ready`, `tool_result`, `message_stop`, `cost`, `error`.
- **Sessions** — `client.sessions(agent)` lists/reads/resumes/forks/watches on-disk sessions. `RunOptions.sessionId` reconnects; `forkSessionId` branches. `noSession: true` runs ephemerally.
- **Invocation modes** — `local`, `docker`, `ssh`, and `k8s` share the same adapter contract.
- **Hooks** — `amux hooks install` wires native settings or a virtual event-stream layer.
- **MCP plugins** — `amux plugins install <server> --agent claude` across claude/codex/gemini/cursor/opencode/openclaw.
- **Auth & install detection** — `amux doctor`, `amux detect --all --json`, `amux install <agent>`.
- **Capabilities & models** — each adapter declares `AgentCapabilities` and `ModelCapabilities[]`.
- **Cost tracking** — `cost` events + `sumCost(events)` / `filterEvents` helpers.
- **Profiles** — named `RunOptions` presets; `amux run --profile fast-claude`.
- **Mock harness** — deterministic scenarios via `--use-mock-harness`.
- **Remote bootstrap** — `amux remote install <host> --harness <agent>`.
- **Host detection** — `amux detect-host`.

## SDK examples

```ts
import { createClient, sumCost, filterEvents } from '@a5c-ai/agent-mux';

// Realtime streaming with cost
const handle = createClient().run({ agent: 'claude-code', prompt: 'Refactor src/api.ts' });
for await (const ev of handle.events()) {
  if (ev.type === 'text_delta') process.stdout.write(ev.delta);
  if (ev.type === 'cost') console.log(`\n$${ev.cost.totalUsd?.toFixed(4)}`);
}

// Post-hoc totals
const sessions = createClient().sessions('claude-code');
const [last] = await sessions.list();
const { events } = await sessions.read(last.sessionId);
const totals = sumCost(events);
for (const tr of filterEvents(events, 'tool_result')) console.log(tr.toolName, tr.durationMs);
```

## Docs site

A Docusaurus site is scaffolded under [`../website/`](../website). It sources these markdown files directly — keep edits here, not in the site.
