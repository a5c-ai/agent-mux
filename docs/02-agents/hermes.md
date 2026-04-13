# Hermes

Adapter for Nous Research's **Hermes** agent CLI.

## Install

```bash
amux install hermes
```

## Auth

Hermes is multi-provider; the adapter accepts any of:

- `OPENROUTER_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `NOUS_API_KEY`
- `GOOGLE_API_KEY`
- `GITHUB_TOKEN`

Config file (YAML): `~/.hermes/cli-config.yaml`.

## Minimal run

```bash
amux run hermes --prompt "Summarize the latest commits"
```

## Notable flags

- `--model <id>` — default `hermes-3-llama-3.1-405b`.
- `--prompt <text>` — forwarded prompt.
- `--auto-approve` — emitted when `approvalMode: 'yolo'`.

## Session files

- Location: `~/.hermes/sessions/*.jsonl`
- JSONL; standard parser.

## Plugins (MCP)

Plugin support: **no** at the plugin layer (`supportsPlugins: false`, empty `pluginFormats`), but `supportsMCP: true` — Hermes can talk to MCP servers directly via its own config.

## Capabilities

Tool calling with parallel calls, tool-call streaming, text streaming, 128k context.

## Known limitations

- No thinking / reasoning streaming.
- No JSON mode or structured output.
- No image or file input.
- Config is YAML and global-only.
- Plugin install/list/uninstall via `amux plugin` is not supported.
