import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import type { AgentEvent } from '@a5c-ai/agent-mux';
import { definePlugin, type EventRenderer, type TuiViewProps } from '../plugin.js';

interface ChatViewInnerProps extends TuiViewProps {
  renderers: EventRenderer[];
}

function ChatViewInner({ eventStream, renderers }: ChatViewInnerProps) {
  const [events, setEvents] = useState<AgentEvent[]>(() => [...eventStream.snapshot()]);
  useEffect(() => {
    return eventStream.subscribe((ev) => {
      setEvents((prev) => [...prev, ev]);
    });
  }, [eventStream]);

  if (events.length === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor>No messages yet. Press `p` to run a prompt.</Text>
      </Box>
    );
  }

  const specific = renderers.filter((r) => r.id !== 'fallback');
  const fallback = renderers.find((r) => r.id === 'fallback');

  return (
    <Box flexDirection="column">
      {events.slice(-200).map((ev, i) => {
        const r = specific.find((x) => x.match(ev)) ?? fallback;
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
      component: (props) => (
        <ChatViewInner {...props} renderers={[]} />
      ),
    });
  },
});

export { ChatViewInner };
