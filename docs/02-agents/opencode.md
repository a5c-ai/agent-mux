# OpenCode

Adapter for the **OpenCode** multi-provider agent CLI.

## Install

```bash
amux install opencode
```

## Auth

OpenCode routes to multiple providers; set one or more of:

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

Config file: `~/.config/opencode/opencode.json`.

## Minimal run

```bash
amux run opencode --prompt "Write a release note for v1.2"
```

## Notable flags

- `--model <id>` — default `claude-sonnet-4-20250514` (via OpenCode).
- `--message <text>` — how the adapter passes the prompt.

## Session files

- Location: `~/.local/share/opencode/*.jsonl`
- Standard JSONL session format.

## Plugins (MCP)

Plugin support: **yes** (`pluginFormats: ['mcp-server']`). Manage via:

```bash
amux plugin install opencode <name>
amux plugin list opencode
```

## Capabilities

Thinking (`low/medium/high`) with streaming, tool calling with parallel tool calls, text streaming, 200k context. Project-level config supported.

## Known limitations

- No JSON mode / structured output.
- No image input, no file attachments.
- Only one bundled model entry; to use other providers, configure them in `opencode.json` and pass the corresponding `--model`.
