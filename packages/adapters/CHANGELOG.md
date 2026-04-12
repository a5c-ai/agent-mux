# @a5c-ai/agent-mux-adapters

## 0.2.0

### Minor Changes

- 71ed1eb: Add built-in adapter for Alibaba's Qwen Code CLI (`qwen`). Supports the
  OpenAI-compatible DashScope auth path via `OPENAI_API_KEY`, two Qwen3-Coder
  models (`qwen3-coder-plus`, `qwen3-coder-flash`), and MCP plugin management
  via `~/.qwen/settings.json`. Capabilities are set conservatively — thinking,
  JSON mode, and image input default to `false` pending upstream confirmation.
- Adapters now fall back to reading per-agent config files when env vars are
  absent. Codex (`~/.codex/auth.json`), Gemini (`~/.gemini/credentials.json`,
  `~/.config/gemini/...`), Cursor (`~/.cursor/auth.json`, `~/.config/cursor/...`),
  and OpenCode (`~/.config/opencode/auth.json`, `~/.opencode/...`) are detected
  via the new `readAuthConfigIdentity` helper. `detectAuth()` returns
  `method: 'config_file'` for these cases so `amux doctor` recognizes users
  who only logged in via the CLI's own browser flow.

### Patch Changes

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

- 71ed1eb: Fix adapter spawn bugs surfaced by reference parity research:

  - **cursor**: `cliCommand` was `"cursor"` but the real binary is `"cursor-agent"` — fixed, cursor runs now actually exec the installed CLI.
  - **claude**: default `--output-format` was `jsonl` but real Claude Code emits incremental content blocks only under `stream-json`. Now defaults to `stream-json` and always passes `--verbose --include-partial-messages` so streaming events aren't swallowed.
  - **claude**: session resume uses `--resume <id>` by default; `--session-id` is now only emitted when `forkSessionId` is set (new session from a fork). Avoids "session already in use" on reconnect.
  - **claude**: `parseEvent` now handles stream-json `stream_event` envelopes — `content_block_delta` `text_delta` → `text_delta`; `input_json_delta` → `tool_input_delta`; `thinking_delta` → `thinking_delta`; `message_stop` → `message_stop`. Previously all silently dropped.
  - **claude**: `authFiles` now lists `~/.claude.json` (the real availability signal) alongside `.claude/settings.json`.

- Updated dependencies [5e58f2a]
- Updated dependencies [71ed1eb]
  - @a5c-ai/agent-mux-core@0.2.0
