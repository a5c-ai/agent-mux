import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import type { AgentEvent } from '@a5c-ai/agent-mux';
import { definePlugin, type EventRenderer, type TuiViewProps } from '../plugin.js';

function ChatView({ renderers }: { renderers: EventRenderer[] } & TuiViewProps) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  useEffect(() => {
    // Consumers push events via ctx.emit in a future iteration; for the
    // scaffold we just render an empty list.
    setEvents([]);
  }, []);
  if (events.length === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor>No messages yet. Press `r` to run an agent.</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column">
      {events.map((ev, i) => {
        const r = renderers.find((x) => x.match(ev));
        const Comp = r?.component;
        return Comp ? <Comp key={i} event={ev} /> : null;
      })}
    </Box>
  );
}

export default definePlugin({
  name: 'builtin:chat-view',
  register(ctx) {
    ctx.registerView({
      id: 'chat',
      title: 'Chat',
      hotkey: '1',
      component: (props) => <ChatView {...props} renderers={[]} />,
    });
  },
});
