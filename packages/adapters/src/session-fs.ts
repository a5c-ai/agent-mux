/**
 * Shared filesystem helpers for adapter session and config I/O.
 *
 * Kept intentionally dependency-free — only uses `node:fs/promises`
 * and `node:path` with forward-slash-safe joins.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { writeFileAtomic, writeJsonAtomic } from '@a5c-ai/agent-mux-core';

/**
 * Recursively list all files matching `predicate` under `dir`.
 * Returns absolute paths with forward slashes.
 * If `dir` does not exist, returns an empty array.
 */
export async function listFilesRecursive(
  dir: string,
  predicate: (entryName: string, fullPath: string) => boolean,
): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string): Promise<void> {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && predicate(entry.name, full)) {
        out.push(full.split(path.sep).join('/'));
      }
    }
  }
  await walk(dir);
  return out;
}

/** List *.jsonl files recursively under `dir`. */
export async function listJsonlFiles(dir: string): Promise<string[]> {
  return listFilesRecursive(dir, (name) => name.toLowerCase().endsWith('.jsonl'));
}

/** List *.json files recursively under `dir`. */
export async function listJsonFiles(dir: string): Promise<string[]> {
  return listFilesRecursive(dir, (name) => name.toLowerCase().endsWith('.json'));
}

/**
 * Parse a JSONL file into an array of record objects (ignores blank lines
 * and lines that fail to parse). Returns empty array if file missing.
 */
export async function parseJsonlFile(filePath: string): Promise<Record<string, unknown>[]> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch {
    return [];
  }
  const rows: Record<string, unknown>[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        rows.push(parsed as Record<string, unknown>);
      }
    } catch {
      // skip malformed line
    }
  }
  return rows;
}

/** Read + parse a JSON file. Returns null if missing or invalid. */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Atomically write JSON via the unified core helper (tmp + fsync + rename
 * with advisory lockfile). Creates parent directories as needed.
 */
export async function writeJsonFileAtomic(filePath: string, data: unknown): Promise<void> {
  await writeJsonAtomic(filePath, data);
}

/**
 * Minimal flat-YAML parser for simple `key: value` files.
 * Supports:
 *  - comments (# ...)
 *  - scalar values (strings, numbers, booleans, null)
 *  - quoted strings ("..." or '...')
 *  - simple nested blocks via two-space indentation (one level deep)
 * Does NOT support lists, anchors, multi-line strings.
 */
export function parseFlatYaml(text: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let currentParent: Record<string, unknown> | null = null;
  let currentParentIndent = -1;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, '').replace(/^#.*$/, '');
    if (!line.trim()) continue;
    const indentMatch = /^(\s*)/.exec(line);
    const indent = indentMatch ? indentMatch[1]!.length : 0;
    const content = line.slice(indent);
    const colonIdx = content.indexOf(':');
    if (colonIdx === -1) continue;
    const key = content.slice(0, colonIdx).trim();
    const valueRaw = content.slice(colonIdx + 1).trim();
    const target = indent > currentParentIndent && currentParent ? currentParent : out;
    if (valueRaw === '') {
      // Start of a nested block
      const child: Record<string, unknown> = {};
      out[key] = child;
      currentParent = child;
      currentParentIndent = indent;
    } else {
      target[key] = coerceYamlScalar(valueRaw);
      if (target === out) {
        currentParent = null;
        currentParentIndent = -1;
      }
    }
  }
  return out;
}

function coerceYamlScalar(s: string): unknown {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  if (/^-?\d+$/.test(s)) return Number(s);
  if (/^-?\d+\.\d+$/.test(s)) return Number(s);
  return s;
}

/** Serialize a flat object to simple YAML (top-level + one level of nesting). */
export function stringifyFlatYaml(obj: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        lines.push(`  ${k}: ${formatYamlScalar(v)}`);
      }
    } else {
      lines.push(`${key}: ${formatYamlScalar(value)}`);
    }
  }
  return lines.join('\n') + '\n';
}

function formatYamlScalar(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') {
    if (/[:#\n]/.test(v) || v === '' || /^\s|\s$/.test(v)) {
      return JSON.stringify(v);
    }
    return v;
  }
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  return JSON.stringify(v);
}

/** Atomically write arbitrary text via the unified core helper. */
export async function writeTextFileAtomic(filePath: string, text: string): Promise<void> {
  await writeFileAtomic(filePath, text);
}

/** fs.stat safely: returns null on ENOENT. */
export async function statSafe(
  filePath: string,
): Promise<{ mtimeMs: number; birthtimeMs: number; size: number } | null> {
  try {
    const st = await fs.stat(filePath);
    return { mtimeMs: st.mtimeMs, birthtimeMs: st.birthtimeMs, size: st.size };
  } catch {
    return null;
  }
}

/**
 * Normalize a path to forward slashes (Windows-safe, cross-platform).
 */
export function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

/**
 * Home-directory-relative join with forward slashes.
 */
export function homeJoin(...segments: string[]): string {
  return toPosix(path.join(os.homedir(), ...segments));
}

/**
 * Shared `parseSessionFile` logic: read JSONL, derive createdAt from
 * file stat birthtime, updatedAt from mtime, and build SessionMessage[]
 * from rows via `rowToMessage` heuristics.
 * The caller supplies the agent name.
 */
export async function parseJsonlSessionFile(
  filePath: string,
  agent: string,
): Promise<{
  sessionId: string;
  agent: string;
  turnCount: number;
  createdAt: string;
  updatedAt: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }>;
  raw: unknown;
}> {
  const sessionId = path.basename(filePath, path.extname(filePath));
  const rows = await parseJsonlFile(filePath);
  const messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }> = [];
  for (const row of rows) {
    const msg = rowToMessage(row);
    if (msg) messages.push(msg);
  }
  const stat = await statSafe(filePath);
  const now = new Date().toISOString();
  const createdAt = stat ? new Date(stat.birthtimeMs || stat.mtimeMs).toISOString() : now;
  const updatedAt = stat ? new Date(stat.mtimeMs).toISOString() : now;
  // A "turn" = user message; fallback to assistant count when no users.
  const userTurns = messages.filter((m) => m.role === 'user').length;
  const assistantTurns = messages.filter((m) => m.role === 'assistant').length;
  const turnCount = userTurns || assistantTurns;
  return { sessionId, agent, turnCount, createdAt, updatedAt, messages, raw: rows };
}

/**
 * Derive a SessionMessage-like representation from an arbitrary JSONL row.
 * Used by adapters that don't have a more precise schema.
 */
export function rowToMessage(row: Record<string, unknown>): {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
} | null {
  const roleRaw = (row['role'] ?? row['sender'] ?? row['type']) as string | undefined;
  let role: 'user' | 'assistant' | 'system' | 'tool';
  if (roleRaw === 'user' || roleRaw === 'human') role = 'user';
  else if (roleRaw === 'assistant' || roleRaw === 'ai' || roleRaw === 'model') role = 'assistant';
  else if (roleRaw === 'system') role = 'system';
  else if (roleRaw === 'tool' || roleRaw === 'tool_result' || roleRaw === 'tool_use') role = 'tool';
  else return null;
  const content =
    (row['content'] as string | undefined) ??
    (row['text'] as string | undefined) ??
    (row['message'] as string | undefined) ??
    '';
  return { role, content: typeof content === 'string' ? content : JSON.stringify(content) };
}
