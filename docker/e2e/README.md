# Docker-based E2E

Two matrices: a **mock** matrix that covers every adapter without credentials,
and a **real** matrix that exercises adapters whose CLIs are installable via npm.

## Mock matrix (no credentials)

One service per adapter. Each runs `run <agent> --use-mock-harness
--mock-scenario <agent>-basic --prompt hello` through the harness-mock.

| Service                         | Adapter            |
| ------------------------------- | ------------------ |
| `mock-e2e-claude`               | claude             |
| `mock-e2e-codex`                | codex              |
| `mock-e2e-cursor`               | cursor             |
| `mock-e2e-gemini`               | gemini             |
| `mock-e2e-opencode`             | opencode           |
| `mock-e2e-openclaw`             | openclaw           |
| `mock-e2e-copilot`              | copilot            |
| `mock-e2e-hermes`               | hermes             |
| `mock-e2e-pi`                   | pi                 |
| `mock-e2e-omp`                  | omp                |
| `mock-e2e-agent-mux-remote`     | agent-mux-remote   |

```bash
docker compose -f docker/e2e/docker-compose.yml build mock-e2e-claude
docker compose -f docker/e2e/docker-compose.yml up --exit-code-from mock-e2e-claude mock-e2e-claude
```

Exit code 0 = pass. CI runs every mock service.

## Real matrix (credentials required)

One service per adapter whose real CLI is installable via npm.

| Service              | Adapter  | Required env var     |
| -------------------- | -------- | -------------------- |
| `real-e2e-claude`    | claude   | `ANTHROPIC_API_KEY`  |
| `real-e2e-codex`     | codex    | `OPENAI_API_KEY`     |
| `real-e2e-cursor`    | cursor   | `CURSOR_API_KEY`     |
| `real-e2e-gemini`    | gemini   | `GOOGLE_API_KEY`     |
| `real-e2e-opencode`  | opencode | `ANTHROPIC_API_KEY`  |

Each real service declares its credentials with `${VAR:?}` guards, so compose
fails fast with a readable error if the variable is unset.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export CURSOR_API_KEY=...
export GOOGLE_API_KEY=AIza...

docker compose -f docker/e2e/docker-compose.yml run --rm real-e2e-claude
docker compose -f docker/e2e/docker-compose.yml run --rm real-e2e-codex
docker compose -f docker/e2e/docker-compose.yml run --rm real-e2e-cursor
docker compose -f docker/e2e/docker-compose.yml run --rm real-e2e-gemini
docker compose -f docker/e2e/docker-compose.yml run --rm real-e2e-opencode
```

Only the mock matrix runs in CI. The real matrix is opt-in per maintainer.
