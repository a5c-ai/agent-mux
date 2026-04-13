# Claude-Specific Notes for Agent-Mux

This file contains important notes and clarifications specific to Claude and agent-mux development.

## OpenCode Project Clarification

**Important**: There are two different projects named "OpenCode":

- ✅ **Supported**: [anomalyco/opencode](https://github.com/anomalyco/opencode) - This is the OpenCode project that agent-mux supports
- ❌ **Not supported**: `opencode-ai/opencode` (renamed to [charmbracelet/crush](https://github.com/charmbracelet/crush)) - This project is **not supported** by agent-mux

When working with OpenCode in agent-mux, always reference the anomalyco/opencode repository. All documentation, install commands, and code references should point to the correct repository.

### Installation Commands
- ✅ Correct: `npm install -g @anomalyco/opencode`
- ❌ Incorrect: `npm install -g opencode-ai`

### Repository URLs
- ✅ Correct: `https://github.com/anomalyco/opencode`
- ❌ Incorrect: `https://github.com/opencode-ai/opencode` (moved to crush)

### Docker Images
- ✅ Correct: `ghcr.io/anomalyco/opencode`
- ❌ Incorrect: `ghcr.io/opencode-ai/opencode`

This distinction is critical to ensure users install and reference the correct OpenCode implementation.