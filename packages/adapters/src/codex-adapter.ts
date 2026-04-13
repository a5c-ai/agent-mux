/**
 * CodexAdapter — OpenAI Codex CLI adapter.
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
  AgentConfig,
} from '@a5c-ai/agent-mux-core';

import { BaseAgentAdapter } from './base-adapter.js';
import {
  listJsonlFiles,
  parseJsonlSessionFile,
  readJsonFile,
  writeJsonFileAtomic,
} from './session-fs.js';
import { readAuthConfigIdentity } from './auth-config.js';

export class CodexAdapter extends BaseAgentAdapter {
  readonly agent = 'codex' as const;
  readonly displayName = 'OpenAI Codex';
  readonly cliCommand = 'codex';
  readonly minVersion = '0.1.0';
  readonly hostEnvSignals = ['CODEX_SESSION_ID', 'CODEX_RUN_ID', 'CODEX_CLI'] as const;

  readonly capabilities: AgentCapabilities = {
    agent: 'codex',
    canResume: true,
    canFork: false,
    supportsMultiTurn: true,
    sessionPersistence: 'file',
    supportsTextStreaming: true,
    supportsToolCallStreaming: true,
    supportsThinkingStreaming: false,
    supportsNativeTools: true,
    supportsMCP: false,
    supportsParallelToolCalls: true,
    requiresToolApproval: true,
    approvalModes: ['yolo', 'prompt', 'deny'],
    supportsThinking: false,
    thinkingEffortLevels: [],
    supportsThinkingBudgetTokens: false,
    supportsJsonMode: true,
    supportsStructuredOutput: true,
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
    supportsPlugins: false,
    pluginFormats: [],
    pluginRegistries: [],
    supportedPlatforms: ['darwin', 'linux', 'win32'],
    requiresGitRepo: false,
    requiresPty: false,
    authMethods: [
      { type: 'api_key', name: 'API Key', description: 'OPENAI_API_KEY environment variable' },
    ],
    authFiles: ['.codex/config.json'],
    installMethods: [
      { platform: 'all', type: 'npm', command: 'npm install -g @openai/codex' },
    ],
  };

  readonly models: ModelCapabilities[] = [
    {
      agent: 'codex',
      modelId: 'o4-mini',
      displayName: 'o4-mini',
      deprecated: false,
      contextWindow: 200000,
      maxOutputTokens: 100000,
      supportsThinking: true,
      thinkingEffortLevels: ['low', 'medium', 'high'],
      supportsToolCalling: true,
      supportsParallelToolCalls: true,
      supportsToolCallStreaming: true,
      supportsJsonMode: true,
      supportsStructuredOutput: true,
      supportsTextStreaming: true,
      supportsThinkingStreaming: false,
      supportsImageInput: false,
      supportsImageOutput: false,
      supportsFileInput: false,
      cliArgKey: '--model',
      cliArgValue: 'o4-mini',
      lastUpdated: '2025-04-01',
      source: 'bundled',
    },
    {
      agent: 'codex',
      modelId: 'codex-mini-latest',
      displayName: 'Codex Mini',
      deprecated: false,
      contextWindow: 200000,
      maxOutputTokens: 100000,
      supportsThinking: false,
      supportsToolCalling: true,
      supportsParallelToolCalls: true,
      supportsToolCallStreaming: true,
      supportsJsonMode: true,
      supportsStructuredOutput: true,
      supportsTextStreaming: true,
      supportsThinkingStreaming: false,
      supportsImageInput: false,
      supportsImageOutput: false,
      supportsFileInput: false,
      cliArgKey: '--model',
      cliArgValue: 'codex-mini-latest',
      lastUpdated: '2025-04-01',
      source: 'bundled',
    },
  ];

  readonly defaultModelId = 'o4-mini';

  readonly configSchema: AgentConfigSchema = {
    agent: 'codex',
    version: 1,
    fields: [],
    configFilePaths: [path.join(os.homedir(), '.codex', 'config.json')],
    configFormat: 'json',
    supportsProjectConfig: false,
  };

  buildSpawnArgs(options: RunOptions): SpawnArgs {
    const args: string[] = [];

    if (options.model) {
      args.push('--model', options.model);
    }

    if (options.approvalMode === 'yolo') {
      args.push('--full-auto');
    }

    const prompt = Array.isArray(options.prompt) ? options.prompt.join('\n') : options.prompt;
    args.push('--quiet', prompt);

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

    if (type === 'message' || type === 'text') {
      const content = (obj['content'] ?? obj['text'] ?? '') as string;
      if (content) {
        return { ...base, type: 'text_delta', delta: content, accumulated: content } as AgentEvent;
      }
    }

    if (type === 'function_call' || type === 'tool_call') {
      return {
        ...base,
        type: 'tool_call_start',
        toolCallId: (obj['id'] ?? obj['call_id'] ?? '') as string,
        toolName: (obj['name'] ?? '') as string,
        inputAccumulated: JSON.stringify(obj['arguments'] ?? obj['input'] ?? {}),
      } as AgentEvent;
    }

    if (type === 'function_call_output' || type === 'tool_result') {
      return {
        ...base,
        type: 'tool_result',
        toolCallId: (obj['call_id'] ?? obj['id'] ?? '') as string,
        toolName: (obj['name'] ?? '') as string,
        output: obj['output'] ?? '',
        durationMs: 0,
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
    const apiKey = process.env['OPENAI_API_KEY'];
    if (apiKey) {
      return {
        status: 'authenticated',
        method: 'api_key',
        identity: `sk-...${apiKey.slice(-4)}`,
      };
    }
    const codexHome = process.env['CODEX_HOME'] ?? path.join(os.homedir(), '.codex');
    const found = await readAuthConfigIdentity([
      path.join(codexHome, 'auth.json'),
      path.join(codexHome, 'credentials.json'),
    ]);
    if (found) {
      return { status: 'authenticated', method: found.method, identity: found.identity };
    }
    return { status: 'unauthenticated' };
  }

  getAuthGuidance(): AuthSetupGuidance {
    return {
      agent: 'codex',
      providerName: 'OpenAI',
      steps: [
        { step: 1, description: 'Get an API key from https://platform.openai.com/api-keys', url: 'https://platform.openai.com/api-keys' },
        { step: 2, description: 'Set the OPENAI_API_KEY environment variable', command: 'export OPENAI_API_KEY=sk-...' },
      ],
      envVars: [
        { name: 'OPENAI_API_KEY', description: 'OpenAI API key', required: true, exampleFormat: 'sk-...' },
      ],
      documentationUrls: ['https://github.com/openai/codex'],
      verifyCommand: 'codex --version',
    };
  }

  sessionDir(_cwd?: string): string {
    return path.join(os.homedir(), '.codex', 'sessions');
  }

  async parseSessionFile(filePath: string): Promise<Session> {
    const parsed = await parseJsonlSessionFile(filePath, 'codex');
    return { ...parsed, agent: 'codex' };
  }

  async listSessionFiles(_cwd?: string): Promise<string[]> {
    return listJsonlFiles(this.sessionDir());
  }

  async readConfig(_cwd?: string): Promise<AgentConfig> {
    const filePath = this.configSchema.configFilePaths?.[0];
    if (!filePath) return { agent: 'codex', source: 'global' };
    const data = (await readJsonFile<Record<string, unknown>>(filePath)) ?? {};
    return { agent: 'codex', source: 'global', filePaths: [filePath], ...data };
  }

  async writeConfig(config: Partial<AgentConfig>, _cwd?: string): Promise<void> {
    const filePath = this.configSchema.configFilePaths?.[0];
    if (!filePath) return;
    const existing = (await readJsonFile<Record<string, unknown>>(filePath)) ?? {};
    const { agent: _a, source: _s, filePaths: _fp, ...rest } = config as Record<string, unknown>;
    void _a; void _s; void _fp;
    await writeJsonFileAtomic(filePath, { ...existing, ...rest });
  }

  /**
   * Codex reads hook commands from ~/.codex/config.json under
   * `hooks[hookType] = [{ command }, ...]`. Append without clobbering.
   */
}
