import React from 'react';
import { Box, Text } from 'ink';
import { definePlugin } from '../plugin.js';

export default definePlugin({
  name: 'builtin:tool-call',
  register(ctx) {
    ctx.registerEventRenderer({
      id: 'tool-call-start',
      match: (ev) => ev.type === 'tool_call_start',
      component: ({ event }) =>
        event.type === 'tool_call_start' ? (
          <Box>
            <Text color="cyan">▶ {event.toolName}</Text>
          </Box>
        ) : null,
    });
    ctx.registerEventRenderer({
      id: 'tool-result',
      match: (ev) => ev.type === 'tool_result',
      component: ({ event }) =>
        event.type === 'tool_result' ? (
          <Box>
            <Text color="green">
              ✓ {event.toolName} ({event.durationMs}ms)
            </Text>
          </Box>
        ) : null,
    });
    ctx.registerEventRenderer({
      id: 'tool-error',
      match: (ev) => ev.type === 'tool_error',
      component: ({ event }) =>
        event.type === 'tool_error' ? (
          <Box>
            <Text color="red">✗ {event.toolName}: {event.error}</Text>
          </Box>
        ) : null,
    });
  },
});
