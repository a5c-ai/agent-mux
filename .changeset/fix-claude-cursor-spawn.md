---
"@a5c-ai/agent-mux-adapters": patch
"@a5c-ai/agent-mux-core": patch
"@a5c-ai/agent-mux-cli": patch
"@a5c-ai/agent-mux": patch
"@a5c-ai/agent-mux-harness-mock": patch
---

Fix adapter spawn bugs surfaced by reference parity research:

- **cursor**: `cliCommand` was `"cursor"` but the real binary is `"cursor-agent"` — fixed, cursor runs now actually exec the installed CLI.
- **claude**: default `--output-format` was `jsonl` but real Claude Code emits incremental content blocks only under `stream-json`. Now defaults to `stream-json` and always passes `--verbose --include-partial-messages` so streaming events aren't swallowed.
- **claude**: session resume now uses `--resume <id>` when `RunOptions.resume` is true (was always `--session-id`, which triggers "session already in use" on reconnect).
