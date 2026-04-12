# Mock Harness

The mock harness replaces the real CLI spawn with a scripted event stream. Use it for tests, CI, and demos where real credentials or network access are undesirable.

## Enabling

Two equivalent switches:

```bash
amux run claude --use-mock-harness --prompt "test"
```

or globally:

```bash
export USE_MOCK_HARNESS=1
amux run claude --prompt "test"
```

Programmatically:

```ts
await client.run({
  agent: 'claude',
  prompt: 'test',
  useMockHarness: true,
});
```

## Scenarios

The mock emits a deterministic sequence of `AgentEvent`s chosen by scenario name:

| Scenario          | What it emits                                               |
| ----------------- | ----------------------------------------------------------- |
| `text`            | A few `text_delta` events and a final `done`.               |
| `tool-call`       | `text_delta` → `tool_call_start` → `tool_call_result` → `done`. |
| `thinking`        | `thinking_delta` events before the final message.           |
| `error`           | Emits an `error` event with `recoverable: false`.           |
| `session-resume`  | Replays a prior session snapshot.                           |

Pick one with `--scenario`:

```bash
amux run claude --use-mock-harness --scenario tool-call --prompt "x"
```

## Why use it

- **CI**: No API keys, no flakiness.
- **Adapter tests**: Validate `parseEvent` without invoking the real CLI.
- **Integration tests**: Exercise hooks, session-save paths, and the event stream in isolation.

See [Harness & Mock](../14-harness-mock.md) for the full event script format.
