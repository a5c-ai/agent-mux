# Cursor

Adapter for the **Cursor** editor's agent CLI.

## Install

```bash
amux install cursor
```

Supported on macOS, Linux and Windows.

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

## Plugins

Plugin support: **yes** — cursor-cli plugin marketplace with single-click installs.

### Plugin Management
```bash
amux plugin install cursor <plugin>
amux plugin list cursor
```

### MCP Servers
```bash
amux mcp install cursor <mcp-server>
amux mcp list cursor
```

## Capabilities

Tool calling with parallel tool calls, text and tool-call streaming, image input, file input, 128k context. Project-level config is supported.

## Known limitations

- Installation is manual (no npm/brew); `amux agent install cursor` reports manual-only.
- No thinking / reasoning modes.
- No JSON / structured-output mode.
- Approval modes are not explicitly wired (no `--yolo` flag emitted).
