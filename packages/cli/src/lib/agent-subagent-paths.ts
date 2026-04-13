import * as os from 'node:os';
import * as path from 'node:path';

export type SubagentScope = 'global' | 'project';

export interface SubagentPaths {
  global: string;
  project: string;
}

const HOME = os.homedir() || '.';

/**
 * Per-agent directories where custom sub-agents live. Each entry is a file
 * (typically markdown with YAML frontmatter) in that directory.
 *
 * References:
 *  - Claude: https://code.claude.com/docs/en/sub-agents (`.claude/agents/`)
 *  - Codex:  https://developers.openai.com/codex/subagents (`.codex/agents/`)
 */
const REGISTRY: Record<string, SubagentPaths> = {
  claude: {
    global: path.join(HOME, '.claude', 'agents'),
    project: path.join('.claude', 'agents'),
  },
  'claude-code': {
    global: path.join(HOME, '.claude', 'agents'),
    project: path.join('.claude', 'agents'),
  },
  codex: {
    global: path.join(HOME, '.codex', 'agents'),
    project: path.join('.codex', 'agents'),
  },
  cursor: {
    global: path.join(HOME, '.cursor', 'agents'),
    project: path.join('.cursor', 'agents'),
  },
  opencode: {
    global: path.join(HOME, '.opencode', 'agents'),
    project: path.join('.opencode', 'agents'),
  },
};

export function getSubagentPaths(agent: string, projectRoot = process.cwd()): SubagentPaths | null {
  const entry = REGISTRY[agent];
  if (!entry) return null;
  return {
    global: entry.global,
    project: path.isAbsolute(entry.project)
      ? entry.project
      : path.join(projectRoot, entry.project),
  };
}

export function getSubagentDir(agent: string, scope: SubagentScope, projectRoot = process.cwd()): string | null {
  const p = getSubagentPaths(agent, projectRoot);
  if (!p) return null;
  return scope === 'global' ? p.global : p.project;
}

export function listSupportedAgents(): string[] {
  return Object.keys(REGISTRY);
}
