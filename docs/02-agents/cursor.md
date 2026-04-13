# Cursor

Adapter for the **Cursor** editor's agent CLI.

## Install

```bash
amux install cursor
```

## Auth

- **API key** — `CURSOR_API_KEY`.
- **Browser login** — sign in to your Cursor account.

Auth/config file: `~/.cursor/settings.json`.

## Minimal run

```bash
amux run cursor --prompt "Refactor this function"
```

## Notable flags

- `--model <id>` — default `cursor-fast`.
- `--prompt <text>` — forwarded from `RunOptions.prompt`.

## Session files

- Location: `~/.cursor/sessions/*.jsonl`
- JSONL format; events of type `text`, `message`, `tool_call` are parsed.

## Plugins (MCP)

Plugin support: **yes** (`supportsMCP: true`, `pluginFormats: ['mcp-server']`). Use `amux plugin install cursor <name>` to register MCP servers.

## Capabilities

Tool calling with parallel tool calls, text and tool-call streaming, image input, file input, 128k context. Project-level config is supported.

## Known limitations

- Installation is manual (no npm/brew); `amux agent install cursor` reports manual-only.
- No thinking / reasoning modes.
- No JSON / structured-output mode.
- Approval modes are not explicitly wired (no `--yolo` flag emitted).
