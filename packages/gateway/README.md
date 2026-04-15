# @a5c-ai/agent-mux-gateway

`@a5c-ai/agent-mux-gateway` is the package scaffold for remote and browser-facing
agent-mux surfaces.

Current scope:

- `GatewayConfig` and default configuration helpers
- `createGateway(config)` returning a start/stop gateway handle
- basic gateway logger wiring

Later tasks in `advanced-uis.md` will add the protocol server, auth, fanout,
run management, and static web UI hosting.
