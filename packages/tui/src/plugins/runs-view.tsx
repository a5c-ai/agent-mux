import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import type { AgentEvent } from '@a5c-ai/agent-mux';
import { definePlugin, type TuiViewProps } from '../plugin.js';

type Status = 'active' | 'completed' | 'aborted' | 'crashed' | 'timeout';

interface Run {
  runId: string;
  agent: string;
  sessionId?: string;
  startedAt: string;
  endedAt?: string;
  status: Status;
  events: number;
  costUsd: number;
}

const TERMINAL: Record<string, Status> = {
  session_end: 'completed',
  aborted: 'aborted',
  crash: 'crashed',
  timeout: 'timeout',
};

function reduce(map: Map<string, Run>, ev: AgentEvent): Map<string, Run> {
  const runId = (ev as { runId?: string }).runId;
  if (!runId) return map;
  const existing = map.get(runId);
  const next: Run = existing ?? {
    runId,
    agent: String((ev as { agent?: string }).agent ?? 'unknown'),
    startedAt: String((ev as unknown as { timestamp?: string | number }).timestamp ?? new Date().toISOString()),
    status: 'active',
    events: 0,
    costUsd: 0,
  };
  next.events += 1;
  if (ev.type === 'session_start') next.sessionId = ev.sessionId;
  if (ev.type === 'cost') next.costUsd += ev.cost.totalUsd ?? 0;
  const terminal = TERMINAL[ev.type];
  if (terminal) {
    next.status = terminal;
    next.endedAt = String((ev as unknown as { timestamp?: string | number }).timestamp ?? new Date().toISOString());
  }
  const out = new Map(map);
  out.set(runId, next);
  return out;
}

function statusColor(s: Status): string {
  if (s === 'active') return 'yellow';
  if (s === 'completed') return 'green';
  return 'red';
}

function RunsView({ eventStream }: TuiViewProps) {
  const [runs, setRuns] = useState<Map<string, Run>>(() => {
    let m = new Map<string, Run>();
    for (const ev of eventStream.snapshot()) m = reduce(m, ev);
    return m;
  });
  useEffect(() => {
    let m = new Map<string, Run>();
    for (const ev of eventStream.snapshot()) m = reduce(m, ev);
    setRuns(m);
    return eventStream.subscribe((ev) => setRuns((prev) => reduce(prev, ev)));
  }, [eventStream]);

  const rows = Array.from(runs.values()).sort((a, b) =>
    a.startedAt < b.startedAt ? 1 : -1,
  );
  if (rows.length === 0) return <Text dimColor>No runs observed yet.</Text>;
  return (
    <Box flexDirection="column">
      <Text bold>Runs (this session)</Text>
      {rows.slice(0, 20).map((r) => (
        <Text key={r.runId}>
          <Text color={statusColor(r.status)}>{r.status.padEnd(10)}</Text>{' '}
          <Text color="cyan">{r.agent.padEnd(14)}</Text>{' '}
          <Text dimColor>{r.runId.slice(0, 8)}</Text>{' '}
          <Text dimColor>events={r.events}</Text>{' '}
          <Text color="yellow">${r.costUsd.toFixed(4)}</Text>
          {r.sessionId ? <Text dimColor> sess={r.sessionId.slice(0, 8)}</Text> : null}
        </Text>
      ))}
      {rows.length > 20 ? <Text dimColor>… {rows.length - 20} more</Text> : null}
    </Box>
  );
}

export default definePlugin({
  name: 'builtin:runs-view',
  register(ctx) {
    ctx.registerView({
      id: 'runs',
      title: 'Runs',
      hotkey: '8',
      component: RunsView,
    });
  },
});
