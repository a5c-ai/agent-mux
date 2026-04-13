# Agent-Specific Notes for Agent-Mux

This file contains important notes and clarifications about the various agents supported by agent-mux.

## OpenCode Project Clarification

**Critical Note**: There are two different projects named "OpenCode":

- ✅ **Supported by agent-mux**: [anomalyco/opencode](https://github.com/anomalyco/opencode) 
- ❌ **Not supported**: `opencode-ai/opencode` (renamed to [charmbracelet/crush](https://github.com/charmbracelet/crush))

### Why This Matters

The `opencode-ai/opencode` project was renamed and moved to `charmbracelet/crush`. Agent-mux deliberately does **not** support the crush project. Instead, we support the `anomalyco/opencode` project, which is a different implementation.

### Correct References

When working with agent-mux OpenCode integration:

**Installation:**
```bash
# Correct
npm install -g @anomalyco/opencode

# Incorrect - DO NOT USE
npm install -g opencode-ai
```

**Documentation URLs:**
- ✅ `https://github.com/anomalyco/opencode`
- ❌ `https://github.com/opencode-ai/opencode`
- ❌ `https://github.com/charmbracelet/crush`

**Docker Images:**
- ✅ `ghcr.io/anomalyco/opencode`
- ❌ `ghcr.io/opencode-ai/opencode`

### Impact on Agent-Mux

All agent-mux adapters, documentation, install commands, and references have been updated to point to the correct `anomalyco/opencode` repository. This ensures users get the intended OpenCode implementation that agent-mux is designed to work with.

## Other Agent Notes

*Additional agent-specific notes and clarifications will be added here as needed.*