# @a5c-ai/agent-mux-cli

## 0.2.0

### Minor Changes

- 71ed1eb: Add built-in adapter for Alibaba's Qwen Code CLI (`qwen`). Supports the
  OpenAI-compatible DashScope auth path via `OPENAI_API_KEY`, two Qwen3-Coder
  models (`qwen3-coder-plus`, `qwen3-coder-flash`), and MCP plugin management
  via `~/.qwen/settings.json`. Capabilities are set conservatively — thinking,
  JSON mode, and image input default to `false` pending upstream confirmation.

### Patch Changes

- 71ed1eb: Fix adapter spawn bugs surfaced by reference parity research:

  - **cursor**: `cliCommand` was `"cursor"` but the real binary is `"cursor-agent"` — fixed, cursor runs now actually exec the installed CLI.
  - **claude**: default `--output-format` was `jsonl` but real Claude Code emits incremental content blocks only under `stream-json`. Now defaults to `stream-json` and always passes `--verbose --include-partial-messages` so streaming events aren't swallowed.
  - **claude**: session resume uses `--resume <id>` by default; `--session-id` is now only emitted when `forkSessionId` is set (new session from a fork). Avoids "session already in use" on reconnect.
  - **claude**: `parseEvent` now handles stream-json `stream_event` envelopes — `content_block_delta` `text_delta` → `text_delta`; `input_json_delta` → `tool_input_delta`; `thinking_delta` → `thinking_delta`; `message_stop` → `message_stop`. Previously all silently dropped.
  - **claude**: `authFiles` now lists `~/.claude.json` (the real availability signal) alongside `.claude/settings.json`.

- Updated dependencies [71ed1eb]
- Updated dependencies
- Updated dependencies [5e58f2a]
- Updated dependencies [71ed1eb]
  - @a5c-ai/agent-mux-adapters@0.2.0
  - @a5c-ai/agent-mux-core@0.2.0
