import React, { useEffect, useState } from 'react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Box, Text } from 'ink';
import { definePlugin, type TuiViewProps } from '../plugin.js';

interface Row {
  agent: string;
  scope: 'global' | 'project';
  name: string;
  dir: string;
}

const HOME = os.homedir() || '.';
const REGISTRY: Record<string, { global: string; project: string }> = {
  claude: { global: path.join(HOME, '.claude', 'agents'), project: path.join('.claude', 'agents') },
  codex: { global: path.join(HOME, '.codex', 'agents'), project: path.join('.codex', 'agents') },
  cursor: { global: path.join(HOME, '.cursor', 'agents'), project: path.join('.cursor', 'agents') },
  opencode: { global: path.join(HOME, '.opencode', 'agents'), project: path.join('.opencode', 'agents') },
};

function readDir(dir: string): string[] {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function AgentsView({ active }: TuiViewProps) {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (!active) return;
    const all: Row[] = [];
    for (const [agent, paths] of Object.entries(REGISTRY)) {
      for (const name of readDir(paths.global)) all.push({ agent, scope: 'global', name, dir: paths.global });
      const proj = path.isAbsolute(paths.project) ? paths.project : path.join(process.cwd(), paths.project);
      for (const name of readDir(proj)) all.push({ agent, scope: 'project', name, dir: proj });
    }
    setRows(all);
  }, [active]);
  if (rows.length === 0) return <Text dimColor>No sub-agents installed. Use `amux agent add` to install.</Text>;
  return (
    <Box flexDirection="column">
      <Text bold>Sub-agents</Text>
      <Text dimColor>(see also: amux agent &lt;list|add|remove|where&gt;)</Text>
      {rows.slice(0, 40).map((r, i) => (
        <Text key={r.agent + ':' + r.scope + ':' + r.name + ':' + i}>
          <Text color="cyan">{r.agent.padEnd(10)}</Text>{' '}
          <Text color="gray">{r.scope.padEnd(7)}</Text>{' '}
          <Text>{r.name}</Text>
        </Text>
      ))}
      {rows.length > 40 ? <Text dimColor>… {rows.length - 40} more</Text> : null}
    </Box>
  );
}

export default definePlugin({
  name: 'builtin:agents-view',
  register(ctx) {
    ctx.registerView({
      id: 'agents',
      title: 'Agents',
      hotkey: 'g',
      component: AgentsView,
    });
  },
});
