# OpenAI Codex

Adapter for OpenAI's **Codex** CLI.

## Install

```bash
amux install codex
```

Supported on macOS, Linux and Windows.

## Auth

- **API key** only — set `OPENAI_API_KEY` in your environment.

Config file: `~/.codex/config.json`.

## Minimal run

```bash
amux run codex --prompt "Write a unit test for utils.ts"
```

## Notable flags

- `--model <id>` — default `o4-mini`; `codex-mini-latest` also available.
- `--full-auto` — emitted when `approvalMode: 'yolo'`.
- `--quiet <prompt>` — used by the adapter to stream prompt output.

## Session files

- Location: `~/.codex/sessions/*.jsonl`
- Parsed via the standard JSONL session reader.
- Resume/fork supported by the adapter layer.

## Plugins (MCP)

Plugin support: **no**. `supportsMCP = false`, `supportsPlugins = false`.

## Capabilities

Thinking models (`o4-mini`) with `low/medium/high` effort levels, tool calling with parallel calls, JSON / structured output, text streaming.

## Known limitations

- No image input/output, no file attachments.
- No MCP or plugin ecosystem — bring-your-own tooling only.
- Only two bundled models; other Codex variants must be specified explicitly via `--model`.
- Project-level config is not supported (`supportsProjectConfig: false`); configuration is global.
