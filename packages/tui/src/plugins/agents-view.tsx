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
    claude: { global: path.join(HOME, '.claude', 'agents'), project: path.join('.claude', 'agents') },
    codex: { global: path.join(HOME, '.codex', 'agents'), project: path.join('.codex', 'agents') },
    cursor: { global: path.join(HOME, '.cursor', 'agents'), project: path.join('.cursor', 'agents') },
    opencode: { global: path.join(HOME, '.opencode', 'agents'), project: path.join('.opencode', 'agents') },
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

function copyPath(src: string, dst: string): void {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const name of fs.readdirSync(src)) copyPath(path.join(src, name), path.join(dst, name));
  } else if (st.isFile()) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

const AGENT_NAMES = ['claude', 'codex', 'cursor', 'opencode'] as const;

function AgentsView({ active }: TuiViewProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<null | 'agent' | 'source'>(null);
  const [addAgentIdx, setAddAgentIdx] = useState(0);
  const [addSource, setAddSource] = useState('');

  const refresh = useCallback(() => {
    const r = scan();
    setRows(r);
    setCursor((c) => Math.min(c, Math.max(r.length - 1, 0)));
  }, []);

  useEffect(() => {
    if (!active) return;
    refresh();
  }, [active, refresh]);

  const performAdd = useCallback((agent: string, source: string) => {
    try {
      const abs = path.resolve(source);
      if (!fs.existsSync(abs)) {
        setStatus(`Source not found: ${abs}`);
        return;
      }
      const dirs = buildRegistry()[agent];
      if (!dirs) {
        setStatus(`Unknown agent: ${agent}`);
        return;
      }
      const proj = path.isAbsolute(dirs.project) ? dirs.project : path.join(process.cwd(), dirs.project);
      const dst = path.join(proj, path.basename(abs));
      if (fs.existsSync(dst)) {
        setStatus(`Already exists: ${dst} (use CLI with --force)`);
        return;
      }
      fs.mkdirSync(proj, { recursive: true });
      copyPath(abs, dst);
      setStatus(`Added ${path.basename(abs)} → ${dst}`);
      refresh();
    } catch (e) {
      setStatus(`Add failed: ${String(e)}`);
    }
  }, [refresh]);

  useInput((input, key) => {
    if (!active) return;
    if (addMode === 'agent') {
      if (key.escape) { setAddMode(null); setStatus('Cancelled'); return; }
      if (key.leftArrow || input === 'h') setAddAgentIdx((i) => Math.max(i - 1, 0));
      else if (key.rightArrow || input === 'l') setAddAgentIdx((i) => Math.min(i + 1, AGENT_NAMES.length - 1));
      else if (key.return) { setAddMode('source'); setAddSource(''); }
      return;
    }
    if (addMode === 'source') {
      if (key.escape) { setAddMode(null); setStatus('Cancelled'); return; }
      if (key.return) {
        const agent = AGENT_NAMES[addAgentIdx]!;
        setAddMode(null);
        performAdd(agent, addSource);
        return;
      }
      if (key.backspace || key.delete) { setAddSource((s) => s.slice(0, -1)); return; }
      if (input && !key.ctrl && !key.meta) setAddSource((s) => s + input);
      return;
    }
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
    else if (input === 'a') { setAddMode('agent'); setAddAgentIdx(0); }
  }, { isActive: active });

  if (rows.length === 0) {
    return <Text dimColor>No sub-agents installed. Use `amux agent add` to install.</Text>;
  }
  return (
    <Box flexDirection="column">
      <Text bold>Sub-agents</Text>
      <Text dimColor>j/k or arrows: move · d: delete · r: refresh · (amux agent &lt;list|add|remove|where&gt;)</Text>
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
      {addMode === 'agent' ? (
        <Box flexDirection="column">
          <Text color="yellow">Select agent (←/→, Enter to confirm, Esc to cancel):</Text>
          <Text>
            {AGENT_NAMES.map((n, i) => (
              <Text key={n} color={i === addAgentIdx ? 'green' : undefined}>
                {i === addAgentIdx ? '[' : ' '}{n}{i === addAgentIdx ? ']' : ' '}{' '}
              </Text>
            ))}
          </Text>
        </Box>
      ) : null}
      {addMode === 'source' ? (
        <Text color="yellow">Source path for {AGENT_NAMES[addAgentIdx]}: {addSource}<Text color="gray">_</Text></Text>
      ) : null}
      {!addMode && !confirmDelete ? <Text dimColor>a: add · d: delete</Text> : null}
      {confirmDelete && rows[cursor] ? (
        <Text color="yellow">Delete {rows[cursor]!.fullPath}? (y/n)</Text>
      ) : null}
      {status ? <Text dimColor>{status}</Text> : null}
    </Box>
  );
}

export default definePlugin({
  name: 'builtin:agents-view',
  register(ctx) {
    ctx.registerView({
      id: 'agents',
      title: 'Agents',
      hotkey: 'G',
      component: AgentsView,
    });
  },
});
