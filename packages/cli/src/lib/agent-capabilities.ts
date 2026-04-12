import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AgentCapabilities {
  supportsPlugins: boolean;
  pluginCommands: string[];
  nativePluginCommand: string;
}

const AGENT_PLUGIN_CONFIGS = {
  claude: {
    command: 'claude plugins',
    commands: ['list', 'install', 'enable', 'disable', 'marketplace', 'uninstall', 'update'],
  },
  gemini: {
    command: 'gemini extensions',
    commands: ['list', 'install', 'update'],
  },
  codex: {
    command: 'codex plugins',
    commands: ['list', 'install'],
  },
  cursor: {
    command: 'cursor plugins',
    commands: ['list', 'install'],
  },
  copilot: {
    command: 'gh copilot plugin',
    commands: ['list', 'install'],
  },
  opencode: {
    command: 'opencode plugins',
    commands: ['list', 'install'],
  }
} as const;

export async function detectAgentCapabilities(agent: string): Promise<AgentCapabilities> {
  const config = AGENT_PLUGIN_CONFIGS[agent as keyof typeof AGENT_PLUGIN_CONFIGS];

  if (!config) {
    return {
      supportsPlugins: false,
      pluginCommands: [],
      nativePluginCommand: '',
    };
  }

  try {
    await execAsync(`${config.command} --help`, { timeout: 5000 });
    return {
      supportsPlugins: true,
      pluginCommands: [...config.commands],
      nativePluginCommand: config.command,
    };
  } catch {
    return {
      supportsPlugins: false,
      pluginCommands: [],
      nativePluginCommand: '',
    };
  }
}