# Capabilities matrix

One-glance view of which features each built-in adapter supports. Every row
is the adapter's declared `capabilities` record — the same data you get at
runtime via `client.adapter(agent).capabilities`.

Legend: ✓ supported · · not supported · ~ partial / virtual-only.

| Feature / Agent        | claude | codex | gemini | copilot | cursor | opencode | openclaw | hermes | pi | omp | qwen | agent-mux-remote |
|------------------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Resume session         | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Fork session           | ✓ | ✓ | ~ | · | ~ | ~ | ~ | · | · | · | ~ | ✓ |
| Multi-turn             | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Text streaming         | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Thinking streaming     | ✓ | ✓ | · | · | · | · | · | · | · | · | ~ | ~ |
| Tool-call streaming    | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | ✓ | ~ | ~ | ~ | ✓ | ✓ |
| Native tools           | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Parallel tool calls    | ✓ | ✓ | ✓ | · | ✓ | ✓ | · | · | · | · | ✓ | ~ |
| MCP plugins            | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | · | · | · | ✓ | ~ |
| Native hooks           | ✓ | ✓ | ✓ | · | ~ | ~ | ~ | · | · | · | ~ | · |
| Virtual hooks          | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Subagent dispatch      | ✓ | · | · | · | · | · | · | · | · | · | · | ~ |
| Skills / AGENTS.md     | ✓ | · | · | · | · | · | · | · | · | · | · | · |
| Image input            | ✓ | · | ✓ | · | · | · | · | · | · | · | ~ | ~ |
| File attachments       | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Approval (yolo/prompt) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| PTY required           | · | · | · | · | · | · | · | · | · | · | · | · |
| Session persistence    | file | file | file | file | file | file | file | file | file | file | file | transport |
| Cost events            | ✓ | ✓ | ✓ | · | ~ | ~ | · | · | · | · | ~ | ~ |
| Invocation modes       | local, docker, ssh, k8s — all adapters (chosen per-run via `RunOptions.invocation`). |

## How this is derived

Each adapter declares `AgentCapabilities` (see
[`packages/core/src/capabilities.ts`](../packages/core/src/capabilities.ts))
and `ModelCapabilities[]`. The matrix above is a human-readable summary;
treat the declared capability objects as the source of truth for runtime
feature gating:

```ts
const caps = client.adapter('claude-code').capabilities;
if (caps.supportsThinking) { /* render thinking UI */ }
if (caps.supportsMCP)      { /* expose MCP plugin settings */ }
```

## Session persistence

`file` adapters store transcripts as JSONL (or equivalent) under the
harness's own session directory — agent-mux reads them back via
`sessions.list()` / `sessions.read()` without re-parsing through the
harness binary.

`transport` (agent-mux-remote) delegates persistence to the remote
endpoint: sessions live on the remote host and are fetched on demand.

## Partial (~) notes

- **thinking streaming — qwen**: emitted as a distinct block but not
  byte-incrementally; the UI sees one delta per reasoning turn.
- **MCP — agent-mux-remote**: routed over the transport; supported iff the
  remote endpoint is running an adapter that supports MCP.
- **virtual hooks**: implemented by agent-mux off the event stream for
  every adapter. Use them when native hooks aren't available or when you
  want the same hook to fire across multiple harnesses.
- **cost — cursor / opencode / qwen**: tokens reported, USD not always.
  The `cost` event still fires with `totalUsd: 0` in that case.
