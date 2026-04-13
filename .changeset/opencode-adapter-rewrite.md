---
"@a5c-ai/agent-mux-adapters": minor
---

feat(opencode): completely rewrite OpenCode adapter for correct anomalyco/opencode project

BREAKING CHANGE: The OpenCode adapter has been completely rewritten to support the correct OpenCode project (anomalyco/opencode) instead of the deprecated opencode-ai/opencode project.

Key changes:
- Updated command structure from `--message` to `run --prompt` 
- Fixed session directory from `~/.local/share/opencode` to `~/.config/opencode/sessions`
- Updated capabilities to reflect actual OpenCode features (no thinking streams, JSON mode support)
- Enhanced authentication to support multiple providers (Anthropic, OpenAI, Google)
- Added support for Claude 3.5 Sonnet and GPT-4o models
- Fixed event parsing for OpenCode's JSON output format
- Updated documentation to clarify distinction from deprecated project

This ensures agent-mux works with the actively maintained OpenCode implementation that has 142k+ GitHub stars.