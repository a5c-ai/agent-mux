/**
 * OpenCodeAdapter — OpenCode CLI adapter.
 */

import * as os from 'node:os';
import * as path from 'node:path';

import type {
  AgentCapabilities,
  ModelCapabilities,
  AgentConfigSchema,
  AuthState,
  AuthSetupGuidance,
  Session,
  SpawnArgs,
  ParseContext,
  RunOptions,
  AgentEvent,
  InstalledPlugin,
  PluginInstallOptions,
  AgentConfig,
} from '@a5c-ai/agent-mux-core';

import { BaseAgentAdapter } from './base-adapter.js';
import { mcpListPlugins, mcpInstallPlugin, mcpUninstallPlugin } from './mcp-plugins.js';
import { readAuthConfigIdentity } from './auth-config.js';
import {
  listJsonlFiles,
  parseJsonlSessionFile,
  readJsonFile,
  writeJsonFileAtomic,
} from './session-fs.js';

export class OpenCodeAdapter extends BaseAgentAdapter {
  readonly agent = 'opencode' as const;
  readonly displayName = 'OpenCode';
  readonly cliCommand = 'opencode';
  readonly minVersion = '0.1.0';
  readonly hostEnvSignals = ['OPENCODE_SESSION', 'OPENCODE_RUN_ID'] as const;

  readonly capabilities: AgentCapabilities = {
    agent: 'opencode',
    canResume: true,
    canFork: false,
    supportsMultiTurn: true,
    sessionPersistence: 'sqlite',
    supportsTextStreaming: true,
    supportsToolCallStreaming: true,
    supportsThinkingStreaming: true,
    supportsNativeTools: true,
    supportsMCP: true,
    supportsParallelToolCalls: true,
    requiresToolApproval: true,
    approvalModes: ['yolo', 'prompt'],
    supportsThinking: true,
    thinkingEffortLevels: ['low', 'medium', 'high'],
    supportsThinkingBudgetTokens: false,
    supportsJsonMode: false,
    supportsStructuredOutput: false,
    supportsSkills: false,
    supportsAgentsMd: false,
    skillsFormat: null,
    supportsSubagentDispatch: false,
    supportsParallelExecution: false,
    supportsInteractiveMode: true,
    supportsStdinInjection: true,
    supportsImageInput: false,
    supportsImageOutput: false,
    supportsFileAttachments: false,
    supportsPlugins: true,
    pluginFormats: ['mcp-server'],
    pluginRegistries: [{ name: 'mcp', url: 'https://modelcontextprotocol.io', searchable: false }],
    supportedPlatforms: ['darwin', 'linux', 'win32'],
    requiresGitRepo: false,
    requiresPty: false,
    authMethods: [
      { type: 'api_key', name: 'Anthropic API Key', description: 'ANTHROPIC_API_KEY environment variable' },
      { type: 'api_key', name: 'OpenAI API Key', description: 'OPENAI_API_KEY environment variable' },
    ],
    authFiles: ['.config/opencode/opencode.json'],
    installMethods: [
      { platform: 'all', type: 'npm', command: 'npm install -g opencode-ai' },
      { platform: 'darwin', type: 'brew', command: 'brew install opencode-ai' },
    ],
  };

  readonly models: ModelCapabilities[] = [
    {
      agent: 'opencode',
      modelId: 'claude-sonnet-4-20250514',
      displayName: 'Claude Sonnet 4 (via OpenCode)',
      deprecated: false,
      contextWindow: 200000,
      maxOutputTokens: 16384,
      supportsThinking: true,
      thinkingEffortLevels: ['low', 'medium', 'high'],
      supportsToolCalling: true,
      supportsParallelToolCalls: true,
      supportsToolCallStreaming: true,
      supportsJsonMode: false,
      supportsStructuredOutput: false,
      supportsTextStreaming: true,
      supportsThinkingStreaming: true,
      supportsImageInput: false,
      supportsImageOutput: false,
      supportsFileInput: false,
      cliArgKey: '--model',
      cliArgValue: 'claude-sonnet-4-20250514',
      lastUpdated: '2025-05-14',
      source: 'bundled',
    },
  ];

  readonly defaultModelId = 'claude-sonnet-4-20250514';

  readonly configSchema: AgentConfigSchema = {
    agent: 'opencode',
    version: 1,
    fields: [],
    configFilePaths: [path.join(os.homedir(), '.config', 'opencode', 'opencode.json')],
    configFormat: 'json',
    supportsProjectConfig: true,
  };

  buildSpawnArgs(options: RunOptions): SpawnArgs {
    const args: string[] = [];

    if (options.model) {
      args.push('--model', options.model);
    }

    const prompt = Array.isArray(options.prompt) ? options.prompt.join('\n') : options.prompt;
    args.push('--message', prompt);

    return {
      command: this.cliCommand,
      args,
      env: this.buildEnvFromOptions(options),
      cwd: options.cwd ?? process.cwd(),
      usePty: false,
      timeout: options.timeout,
      inactivityTimeout: options.inactivityTimeout,
    };
  }

  parseEvent(line: string, context: ParseContext): AgentEvent | AgentEvent[] | null {
    const parsed = this.parseJsonLine(line);
    if (parsed == null || typeof parsed !== 'object') return null;

    const obj = parsed as Record<string, unknown>;
    const ts = Date.now();
    const base = { runId: context.runId, agent: this.agent, timestamp: ts };

    const type = obj['type'] as string | undefined;

    if (type === 'text' || type === 'content') {
      const content = (obj['content'] ?? obj['text'] ?? '') as string;
      if (content) {
        return { ...base, type: 'text_delta', delta: content, accumulated: content } as AgentEvent;
      }
    }

    if (type === 'tool_call') {
      return {
        ...base,
        type: 'tool_call_start',
        toolCallId: (obj['id'] ?? '') as string,
        toolName: (obj['name'] ?? '') as string,
        inputAccumulated: JSON.stringify(obj['input'] ?? {}),
      } as AgentEvent;
    }

    if (type === 'error') {
      return {
        ...base,
        type: 'error',
        code: 'INTERNAL' as const,
        message: (obj['message'] ?? 'Unknown error') as string,
        recoverable: false,
      } as AgentEvent;
    }

    return null;
  }

  async detectAuth(): Promise<AuthState> {
    if (process.env['ANTHROPIC_API_KEY']) {
      return {
        status: 'authenticated',
        method: 'api_key',
        identity: `anthropic:...${process.env['ANTHROPIC_API_KEY']!.slice(-4)}`,
      };
    }
    if (process.env['OPENAI_API_KEY']) {
      return {
        status: 'authenticated',
        method: 'api_key',
        identity: `openai:...${process.env['OPENAI_API_KEY']!.slice(-4)}`,
      };
    }
    const home = os.homedir();
    const found = await readAuthConfigIdentity([
      path.join(home, '.config', 'opencode', 'auth.json'),
      path.join(home, '.opencode', 'auth.json'),
      path.join(home, '.opencode', 'credentials.json'),
    ]);
    if (found) {
      return { status: 'authenticated', method: 'config_file', identity: found.identity };
    }
    return { status: 'unauthenticated' };
  }

  getAuthGuidance(): AuthSetupGuidance {
    return {
      agent: 'opencode',
      providerName: 'OpenCode',
      steps: [
        { step: 1, description: 'Set an API key for your preferred provider' },
        { step: 2, description: 'For Anthropic: export ANTHROPIC_API_KEY=sk-ant-...', command: 'export ANTHROPIC_API_KEY=sk-ant-...' },
        { step: 3, description: 'For OpenAI: export OPENAI_API_KEY=sk-...', command: 'export OPENAI_API_KEY=sk-...' },
      ],
      envVars: [
        { name: 'ANTHROPIC_API_KEY', description: 'Anthropic API key', required: false },
        { name: 'OPENAI_API_KEY', description: 'OpenAI API key', required: false },
      ],
      documentationUrls: ['https://github.com/opencode-ai/opencode'],
      verifyCommand: 'opencode --version',
    };
  }

  sessionDir(_cwd?: string): string {
    return path.join(os.homedir(), '.local', 'share', 'opencode');
  }

  async parseSessionFile(filePath: string): Promise<Session> {
    const parsed = await parseJsonlSessionFile(filePath, 'opencode');
    return { ...parsed, agent: 'opencode' };
  }

  async listSessionFiles(_cwd?: string): Promise<string[]> {
    return listJsonlFiles(this.sessionDir());
  }

  async readConfig(_cwd?: string): Promise<AgentConfig> {
    const filePath = this.configSchema.configFilePaths?.[0];
    if (!filePath) return { agent: 'opencode', source: 'global' };
    const data = (await readJsonFile<Record<string, unknown>>(filePath)) ?? {};
    return { agent: 'opencode', source: 'global', filePaths: [filePath], ...data };
  }

  async writeConfig(config: Partial<AgentConfig>, _cwd?: string): Promise<void> {
    const filePath = this.configSchema.configFilePaths?.[0];
    if (!filePath) return;
    const existing = (await readJsonFile<Record<string, unknown>>(filePath)) ?? {};
    const { agent: _a, source: _s, filePaths: _fp, ...rest } = config as Record<string, unknown>;
    void _a; void _s; void _fp;
    await writeJsonFileAtomic(filePath, { ...existing, ...rest });
  }

  private pluginsPath(): string {
    return this.configSchema.configFilePaths?.[0] ?? '';
  }

  override async listPlugins(): Promise<InstalledPlugin[]> {
    return mcpListPlugins(this.pluginsPath());
  }

  override async installPlugin(
    pluginId: string,
    options?: PluginInstallOptions,
  ): Promise<InstalledPlugin> {
    return mcpInstallPlugin(this.pluginsPath(), pluginId, options);
  }

  override async uninstallPlugin(pluginId: string): Promise<void> {
    return mcpUninstallPlugin(this.pluginsPath(), pluginId);
  }
}
