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

## Docs site

A Docusaurus site is scaffolded under [`../website/`](../website). It sources these markdown files directly — keep edits here, not in the site.
