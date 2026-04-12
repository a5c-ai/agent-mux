# @a5c-ai/agent-mux-core

## 0.2.0

### Minor Changes

- 5e58f2a: Address research-surfaced leftovers:

  - **core**: new exports `sumCost`, `sumCostAsync`, `filterEvents`,
    `filterEventsAsync`, and `CostSummary` type. Works on both live
    `handle.events()` streams and stored session event arrays. Removes the
    per-call switch/reduce boilerplate.
  - **adapters**: `buildEnvFromOptions` now propagates harness-relevant env
    vars (`CODEX_HOME`, `GH_HOST`, `GH_TOKEN`, `GOOGLE_APPLICATION_CREDENTIALS`,
    `HTTPS_PROXY` / `HTTP_PROXY` / `NO_PROXY`) into every spawn. Fixes codex
    runs that need a non-default `CODEX_HOME` and copilot runs against
    GitHub Enterprise via `GH_HOST`. Explicit `RunOptions.env` still wins.
  - **docs**: new capability matrix page (`docs/19-capabilities-matrix.md`)
    and cost-tracking tutorial.

### Patch Changes

- 71ed1eb: Fix adapter spawn bugs surfaced by reference parity research:

  - **cursor**: `cliCommand` was `"cursor"` but the real binary is `"cursor-agent"` — fixed, cursor runs now actually exec the installed CLI.
  - **claude**: default `--output-format` was `jsonl` but real Claude Code emits incremental content blocks only under `stream-json`. Now defaults to `stream-json` and always passes `--verbose --include-partial-messages` so streaming events aren't swallowed.
  - **claude**: session resume uses `--resume <id>` by default; `--session-id` is now only emitted when `forkSessionId` is set (new session from a fork). Avoids "session already in use" on reconnect.
  - **claude**: `parseEvent` now handles stream-json `stream_event` envelopes — `content_block_delta` `text_delta` → `text_delta`; `input_json_delta` → `tool_input_delta`; `thinking_delta` → `thinking_delta`; `message_stop` → `message_stop`. Previously all silently dropped.
  - **claude**: `authFiles` now lists `~/.claude.json` (the real availability signal) alongside `.claude/settings.json`.
