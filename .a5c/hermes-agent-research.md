# hermes-agent Research Summary

## Identity
- **Repo:** NousResearch/hermes-agent (MIT, Python 94%, v0.8.0)
- **CLI binary:** `hermes` (entry: `hermes_cli.main:main`). Secondary: `hermes-agent` (run_agent:main), `hermes-acp` (ACP adapter).
- **Subcommands:** `hermes model`, `hermes tools`, `hermes config set`, `hermes gateway`, `hermes setup`, `hermes doctor`, `hermes login`.

## Installation
- Shell installer: `curl -fsSL .../scripts/install.sh | bash`
- Python package via pip/uv (requires Python >= 3.11)
- Nix flake available (`flake.nix`)
- Docker support (Dockerfile present)

## Configuration
- **Format:** YAML (`cli-config.yaml`)
- **Location:** `~/.hermes/` directory
- **Env vars:** `.env` file support; env vars override YAML. Key vars: `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `NOUS_API_KEY`, `GITHUB_TOKEN`, `GOOGLE_API_KEY`, etc.
- **Example:** `cli-config.yaml.example` in repo root.

## Model/Provider Support
Extensive multi-provider: OpenRouter (200+ models), Anthropic direct, OpenAI, Nous Portal (OAuth), GitHub Copilot, Gemini, z.ai/GLM, Kimi/Moonshot, MiniMax, Hugging Face, KiloCode, Vercel AI Gateway, and any OpenAI-compatible endpoint (LM Studio, Ollama, vLLM, llama.cpp). Default model: `anthropic/claude-opus-4.6`. Provider selected via config, `--provider` flag, or `HERMES_INFERENCE_PROVIDER` env var.

## Session/Memory Storage
- Persistent memory with agent-curated entries in `~/.hermes/`
- FTS5-based session search with LLM summarization for cross-session recall
- Honcho dialectic user modeling (optional dependency)

## Streaming
Yes -- streaming tool output in terminal. Interactive CLI built on `prompt_toolkit` with multiline editing, slash-command autocomplete, conversation history, interrupt-and-redirect.

## Tool Calling / MCP
- 40+ built-in tools across multiple domains
- MCP client integration: connect any MCP server for extended capabilities (mcp dep in dev extras)
- MCP server mode: `mcp_serve.py` present; `hermes-acp` entry point for ACP adapter
- Tool configuration via `hermes tools` command
- Python RPC for pipeline collapsing

## Thinking/Reasoning
No explicit extended-thinking/reasoning mode documented. Focus is on skill creation and procedural learning.

## Plugin/Extension System
- **Plugins directory:** `plugins/` with `context_engine` and `memory` subdirectories
- **Skills system:** User-created skills stored in `~/.hermes/skills/`; skills auto-generated after complex tasks; self-improving during use
- **Skills Hub:** Compatible with agentskills.io open standard
- **Optional skills:** `optional-skills/` directory in repo

## Auth Methods
- API keys via env vars or config YAML
- OAuth: `hermes login` for Nous Portal, `hermes login --provider openai-codex` for OpenAI Codex
- GitHub token for Copilot
- Command approval/allowlist security model
- Container isolation available

## Platform Support
- **OS:** Linux, macOS, WSL2, Android (Termux). Windows requires WSL2.
- **Terminal backends:** Local, Docker, SSH, Daytona, Modal, Singularity
- **Messaging gateways:** Telegram, Discord, Slack, WhatsApp, Signal, Email, Matrix, Home Assistant
