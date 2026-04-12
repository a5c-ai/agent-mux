---
'@a5c-ai/agent-mux-tui': minor
---

New package: Ink-based TUI scaffold with plugin-first architecture. Ships built-in plugins for `text_delta`/`thinking_delta`, tool-call rendering, cost, chat view, and sessions list. Host provides only the Ink process, view router, and SDK-injected `TuiContext`; renderers, views, and commands all register through the same plugin API (`definePlugin`, `registerView`, `registerEventRenderer`, `registerCommand`).
