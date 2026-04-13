import React from 'react';
import { Box, Text } from 'ink';
import { definePlugin, type TuiViewProps } from '../plugin.js';

const GLOBAL_KEYS: { key: string; desc: string }[] = [
  { key: 'p', desc: 'open prompt input' },
  { key: '/', desc: 'set global event filter (substring or `type:<prefix>`)' },
  { key: ':', desc: 'open command palette (also Ctrl-K)' },
  { key: 'm', desc: 'pick model for next run' },
  { key: 'P', desc: 'pick run-options profile' },
  { key: 'i', desc: 'interrupt current run' },
  { key: 'y / n', desc: 'approve / deny pending tool request' },
  { key: '1-9', desc: 'switch to view by hotkey' },
  { key: 'q / Ctrl-C', desc: 'quit' },
];

function HelpView({ client }: TuiViewProps) {
  let viewCount = 0;
  let cmdCount = 0;
  let agentList: string[] = [];
  try {
    agentList = client.adapters.list().map((a) => a.agent);
  } catch {
    agentList = [];
  }
  // Registry isn't passed to views; we surface counts via the conf bar instead.
  void viewCount;
  void cmdCount;
  return (
    <Box flexDirection="column">
      <Text bold>Keybindings</Text>
      {GLOBAL_KEYS.map((k) => (
        <Text key={k.key}>
          <Text color="cyan">{k.key.padEnd(12)}</Text> {k.desc}
        </Text>
      ))}
      <Text> </Text>
      <Text bold>Discovered agents</Text>
      {agentList.length === 0 ? (
        <Text dimColor>(none)</Text>
      ) : (
        agentList.map((a) => <Text key={a}>· {a}</Text>)
      )}
      <Text> </Text>
      <Text bold>Tips</Text>
      <Text dimColor>· Filter syntax: `type:tool` matches all events whose type contains "tool".</Text>
      <Text dimColor>· In Sessions view, press `d` to inspect a session and export it.</Text>
      <Text dimColor>· Set AMUX_TUI_COST_ALERT=&quot;1,5,10&quot; to get cost crossing alerts.</Text>
    </Box>
  );
}

export default definePlugin({
  name: 'builtin:help-view',
  register(ctx) {
    ctx.registerView({
      id: 'help',
      title: 'Help',
      hotkey: '9',
      component: HelpView,
    });
  },
});
