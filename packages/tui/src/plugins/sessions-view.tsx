import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { definePlugin, type TuiViewProps } from '../plugin.js';

interface Row {
  sessionId: string;
  agent: string;
}

function SessionsView({ client, active, emit, activeSessions }: TuiViewProps) {
  const [sessions, setSessions] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<number>(0);

  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setCursor(0);
        setSessions([]);
        const agents = client.adapters.list();
        const rowsByAgent = new Map<string, Row[]>();
        const mergeRows = () =>
          agents.flatMap((ad) => rowsByAgent.get(ad.agent) ?? []).slice(0, 50);

        await Promise.all(
          agents.map(async (ad) => {
            try {
              const list = await client.sessions.list(ad.agent, { limit: 20 });
              rowsByAgent.set(
                ad.agent,
                list.map((s) => ({ sessionId: s.sessionId, agent: ad.agent })),
              );
              if (!cancelled) {
                setSessions(mergeRows());
              }
            } catch {
              // ignore per-agent listing errors (e.g. adapter without sessions)
            }
          }),
        );
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
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
        const isActive = activeSessions?.has(`${s.agent}:${s.sessionId}`) ?? false;
        return (
          <Text key={s.agent + ':' + s.sessionId} color={selected ? 'green' : undefined}>
            {selected ? '> ' : '  '}
            {isActive ? <Text color="yellow">● </Text> : <Text>  </Text>}
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
