# @a5c-ai/agent-mux-harness-mock

## 0.2.0

### Patch Changes

- 71ed1eb: Fix adapter spawn bugs surfaced by reference parity research:

  - **cursor**: `cliCommand` was `"cursor"` but the real binary is `"cursor-agent"` — fixed, cursor runs now actually exec the installed CLI.
  - **claude**: default `--output-format` was `jsonl` but real Claude Code emits incremental content blocks only under `stream-json`. Now defaults to `stream-json` and always passes `--verbose --include-partial-messages` so streaming events aren't swallowed.
  - **claude**: session resume uses `--resume <id>` by default; `--session-id` is now only emitted when `forkSessionId` is set (new session from a fork). Avoids "session already in use" on reconnect.
  - **claude**: `parseEvent` now handles stream-json `stream_event` envelopes — `content_block_delta` `text_delta` → `text_delta`; `input_json_delta` → `tool_input_delta`; `thinking_delta` → `thinking_delta`; `message_stop` → `message_stop`. Previously all silently dropped.
  - **claude**: `authFiles` now lists `~/.claude.json` (the real availability signal) alongside `.claude/settings.json`.

- Updated dependencies [5e58f2a]
- Updated dependencies [71ed1eb]
  - @a5c-ai/agent-mux-core@0.2.0
