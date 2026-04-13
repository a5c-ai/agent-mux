import React, { useCallback, useEffect, useState } from 'react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Box, Text, useInput } from 'ink';
import { definePlugin, type TuiViewProps } from '../plugin.js';

interface Row {
  agent: string;
  scope: 'global' | 'project';
  name: string;
  dir: string;
  fullPath: string;
}

function buildRegistry(): Record<string, { global: string; project: string }> {
  const HOME = os.homedir() || '.';
  return {
    claude: { global: path.join(HOME, '.claude', 'skills'), project: path.join('.claude', 'skills') },
    codex: { global: path.join(HOME, '.codex', 'skills'), project: path.join('.codex', 'skills') },
    cursor: { global: path.join(HOME, '.cursor', 'skills'), project: path.join('.cursor', 'skills') },
    opencode: { global: path.join(HOME, '.opencode', 'skills'), project: path.join('.opencode', 'skills') },
    gemini: { global: path.join(HOME, '.gemini', 'skills'), project: path.join('.gemini', 'skills') },
    copilot: { global: path.join(HOME, '.github', 'copilot', 'skills'), project: path.join('.github', 'copilot', 'skills') },
  };
}

function readDir(dir: string): string[] {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function scan(): Row[] {
  const all: Row[] = [];
  for (const [agent, paths] of Object.entries(buildRegistry())) {
    for (const name of readDir(paths.global)) {
      all.push({ agent, scope: 'global', name, dir: paths.global, fullPath: path.join(paths.global, name) });
    }
    const proj = path.isAbsolute(paths.project) ? paths.project : path.join(process.cwd(), paths.project);
    for (const name of readDir(proj)) {
      all.push({ agent, scope: 'project', name, dir: proj, fullPath: path.join(proj, name) });
    }
  }
  return all;
}

function SkillsView({ active }: TuiViewProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const r = scan();
    setRows(r);
    setCursor((c) => Math.min(c, Math.max(r.length - 1, 0)));
  }, []);

  useEffect(() => {
    if (!active) return;
    refresh();
  }, [active, refresh]);

  useInput((input, key) => {
    if (!active) return;
    if (confirmDelete) {
      if (input === 'y' || input === 'Y') {
        const row = rows[cursor];
        if (row) {
          try {
            fs.rmSync(row.fullPath, { recursive: true, force: true });
            setStatus(`Deleted ${row.name}`);
            refresh();
          } catch (e) {
            setStatus(`Delete failed: ${String(e)}`);
          }
        }
        setConfirmDelete(false);
      } else if (input === 'n' || input === 'N' || key.escape) {
        setConfirmDelete(false);
        setStatus('Cancelled');
      }
      return;
    }
    if (key.downArrow || input === 'j') setCursor((c) => Math.min(c + 1, Math.max(rows.length - 1, 0)));
    else if (key.upArrow || input === 'k') setCursor((c) => Math.max(c - 1, 0));
    else if (input === 'r') refresh();
    else if (input === 'd' && rows[cursor]) setConfirmDelete(true);
  }, { isActive: active });

  if (rows.length === 0) {
    return <Text dimColor>No skills installed. Use `amux skill add` to install.</Text>;
  }
  return (
    <Box flexDirection="column">
      <Text bold>Skills</Text>
      <Text dimColor>j/k or arrows: move · d: delete · r: refresh · (amux skill &lt;list|add|remove|where&gt;)</Text>
      {rows.slice(0, 40).map((r, i) => {
        const sel = i === cursor;
        return (
          <Text key={r.agent + ':' + r.scope + ':' + r.name + ':' + i} color={sel ? 'green' : undefined}>
            {sel ? '> ' : '  '}
            <Text color="cyan">{r.agent.padEnd(10)}</Text>{' '}
            <Text color="gray">{r.scope.padEnd(7)}</Text>{' '}
            <Text>{r.name}</Text>
          </Text>
        );
      })}
      {rows.length > 40 ? <Text dimColor>… {rows.length - 40} more</Text> : null}
      {confirmDelete && rows[cursor] ? (
        <Text color="yellow">Delete {rows[cursor]!.fullPath}? (y/n)</Text>
      ) : null}
      {status ? <Text dimColor>{status}</Text> : null}
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
