import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { definePlugin, type TuiViewProps } from '../plugin.js';

function SessionsView({ client, active }: TuiViewProps) {
  const [sessions, setSessions] = useState<{ sessionId: string; agent: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!active) return;
    (async () => {
      try {
        const agents = ['claude-code', 'codex', 'gemini'] as const;
        const all: { sessionId: string; agent: string }[] = [];
        for (const a of agents) {
          try {
            const list = await client.sessions.list(a);
            for (const s of list) all.push({ sessionId: s.sessionId, agent: a });
          } catch {
            // ignore per-agent listing errors
          }
        }
        setSessions(all.slice(0, 20));
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [active, client]);
  if (error) return <Text color="red">{error}</Text>;
  if (sessions.length === 0) return <Text dimColor>No sessions found.</Text>;
  return (
    <Box flexDirection="column">
      {sessions.map((s) => (
        <Text key={s.agent + ':' + s.sessionId}>
          <Text color="cyan">{s.agent}</Text> {s.sessionId}
        </Text>
      ))}
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
