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
  claude: { global: path.join(HOME, '.claude', 'skills'), project: path.join('.claude', 'skills') },
  codex: { global: path.join(HOME, '.codex', 'skills'), project: path.join('.codex', 'skills') },
  cursor: { global: path.join(HOME, '.cursor', 'skills'), project: path.join('.cursor', 'skills') },
  opencode: { global: path.join(HOME, '.opencode', 'skills'), project: path.join('.opencode', 'skills') },
  gemini: { global: path.join(HOME, '.gemini', 'skills'), project: path.join('.gemini', 'skills') },
  copilot: { global: path.join(HOME, '.github', 'copilot', 'skills'), project: path.join('.github', 'copilot', 'skills') },
};

function readDir(dir: string): string[] {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function SkillsView({ active }: TuiViewProps) {
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
  if (rows.length === 0) return <Text dimColor>No skills installed. Use `amux skill add` to install.</Text>;
  return (
    <Box flexDirection="column">
      <Text bold>Skills</Text>
      <Text dimColor>(see also: amux skill &lt;list|add|remove|where&gt;)</Text>
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
  name: 'builtin:skills-view',
  register(ctx) {
    ctx.registerView({
      id: 'skills',
      title: 'Skills',
      hotkey: 'k',
      component: SkillsView,
    });
  },
});
