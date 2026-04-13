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
            {event.inputAccumulated ? (
              <Text dimColor> {event.inputAccumulated.slice(0, 120).replace(/\s+/g, ' ')}</Text>
            ) : null}
          </Box>
        ) : null,
    });
    ctx.registerEventRenderer({
      id: 'tool-call-ready',
      match: (ev) => ev.type === 'tool_call_ready',
      component: ({ event }) => {
        if (event.type !== 'tool_call_ready') return null;
        let preview = '';
        try {
          preview = typeof event.input === 'string' ? event.input : JSON.stringify(event.input);
        } catch {
          preview = String(event.input);
        }
        return (
          <Box>
            <Text color="cyan">⏵ {event.toolName}</Text>
            <Text dimColor> {preview.slice(0, 160).replace(/\s+/g, ' ')}</Text>
          </Box>
        );
      },
    });
    ctx.registerEventRenderer({
      id: 'tool-result',
      match: (ev) => ev.type === 'tool_result',
      component: ({ event }) => {
        if (event.type !== 'tool_result') return null;
        let preview = '';
        try {
          preview = typeof event.output === 'string' ? event.output : JSON.stringify(event.output);
        } catch {
          preview = String(event.output);
        }
        return (
          <Box>
            <Text color="green">✓ {event.toolName} ({event.durationMs}ms)</Text>
            {preview ? <Text dimColor> {preview.slice(0, 160).replace(/\s+/g, ' ')}</Text> : null}
          </Box>
        );
      },
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
