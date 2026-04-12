---
"@a5c-ai/agent-mux-adapters": minor
"@a5c-ai/agent-mux-cli": minor
"@a5c-ai/agent-mux": minor
---

Add built-in adapter for Alibaba's Qwen Code CLI (`qwen`). Supports the
OpenAI-compatible DashScope auth path via `OPENAI_API_KEY`, two Qwen3-Coder
models (`qwen3-coder-plus`, `qwen3-coder-flash`), and MCP plugin management
via `~/.qwen/settings.json`. Capabilities are set conservatively — thinking,
JSON mode, and image input default to `false` pending upstream confirmation.
