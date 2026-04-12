---
"@a5c-ai/agent-mux-core": minor
"@a5c-ai/agent-mux-adapters": patch
"@a5c-ai/agent-mux": minor
---

Address research-surfaced leftovers:

- **core**: new exports `sumCost`, `sumCostAsync`, `filterEvents`,
  `filterEventsAsync`, and `CostSummary` type. Works on both live
  `handle.events()` streams and stored session event arrays. Removes the
  per-call switch/reduce boilerplate.
- **adapters**: `buildEnvFromOptions` now propagates harness-relevant env
  vars (`CODEX_HOME`, `GH_HOST`, `GH_TOKEN`, `GOOGLE_APPLICATION_CREDENTIALS`,
  `HTTPS_PROXY` / `HTTP_PROXY` / `NO_PROXY`) into every spawn. Fixes codex
  runs that need a non-default `CODEX_HOME` and copilot runs against
  GitHub Enterprise via `GH_HOST`. Explicit `RunOptions.env` still wins.
- **docs**: new capability matrix page (`docs/19-capabilities-matrix.md`)
  and cost-tracking tutorial.
