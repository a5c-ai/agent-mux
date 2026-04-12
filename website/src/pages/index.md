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

## Learn more

- [Adapter pages](/docs/category/agents) — per-agent install, auth, flags, and limits
- [Invocation Modes](/docs/13-invocation-modes) — docker, k8s, ssh
- [Hooks](/docs/tutorials/hooks) and [Plugins](/docs/tutorials/plugins)
- [Multi-agent dispatch](/docs/tutorials/multi-agent)
