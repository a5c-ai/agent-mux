import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { definePlugin, type TuiViewProps } from '../plugin.js';

interface Row {
  sessionId: string;
  agent: string;
}

function SessionsView({ client, active, emit }: TuiViewProps) {
  const [sessions, setSessions] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<number>(0);

  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    (async () => {
      try {
        const all: Row[] = [];
        for (const ad of client.adapters.list()) {
          try {
            const list = await client.sessions.list(ad.agent);
            for (const s of list) all.push({ sessionId: s.sessionId, agent: ad.agent });
          } catch {
            // ignore per-agent listing errors (e.g. adapter without sessions)
          }
        }
        setSessions(all.slice(0, 50));
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [active, client, refreshTick]);

  useInput(
    (_input, key) => {
      if (sessions.length === 0) return;
      if (key.downArrow) setCursor((c) => Math.min(c + 1, sessions.length - 1));
      else if (key.upArrow) setCursor((c) => Math.max(c - 1, 0));
      else if (key.return) {
        const sel = sessions[cursor];
        if (!sel) return;
        emit({ type: 'session:select', agent: sel.agent, sessionId: sel.sessionId });
        emit({ type: 'view:switch', id: 'chat' });
      } else if (_input === 'd') {
        const sel = sessions[cursor];
        if (!sel) return;
        emit({ type: 'session:detail', agent: sel.agent, sessionId: sel.sessionId });
        emit({ type: 'view:switch', id: 'session-detail' });
      } else if (_input === 'D') {
        const sel = sessions[cursor];
        if (!sel) return;
        emit({ type: 'session:diff', agent: sel.agent, sessionId: sel.sessionId });
      } else if (_input === 'R') {
        setRefreshTick((t) => t + 1);
      }
    },
    { isActive: active },
  );

  if (error) return <Text color="red">{error}</Text>;
  if (sessions.length === 0) return <Text dimColor>No sessions found.</Text>;
  return (
    <Box flexDirection="column">
      {sessions.map((s, i) => {
        const selected = i === cursor;
        return (
          <Text key={s.agent + ':' + s.sessionId} color={selected ? 'green' : undefined}>
            {selected ? '> ' : '  '}
            <Text color="cyan">{s.agent}</Text> {s.sessionId}
          </Text>
        );
      })}
      <Text dimColor>↑/↓ navigate · Enter: resume · d: details · D: mark/diff · R: refresh</Text>
    </Box>
  );
}

export default definePlugin({
  name: 'builtin:sessions-view',
  register(ctx) {
    ctx.registerView({
      id: 'sessions',
      title: 'Sessions',
      hotkey: '2',
      component: SessionsView,
    });
  },
});
