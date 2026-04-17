/**
 * CodexWebSocketAdapter — WebSocket-based Codex adapter for real-time communication.
 *
 * Uses the Codex app-server architecture with WebSocket connections for
 * bidirectional real-time communication and enhanced streaming capabilities.
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
  RunOptions,
  AgentEvent,
  AgentConfig,
  RemoteConnection,
  WebSocketConnection,
  ServerInfo,
  CostRecord,
} from '@a5c-ai/agent-mux-core';

import { BaseRemoteAdapter } from './remote-adapter-base.js';
import { createVirtualRuntimeHookCapabilities } from './shared/runtime-hooks-virtual.js';
import {
  listJsonlFiles,
  parseCodexSessionFile,
  readJsonFile,
  writeJsonFileAtomic,
} from './session-fs.js';
import { readAuthConfigIdentity } from './auth-config.js';
import { CodexWebSocketConnection } from './codex-websocket-connection.js';
export { CodexWebSocketConnection } from './codex-websocket-connection.js';

export class CodexWebSocketAdapter extends BaseRemoteAdapter {
  readonly agent = 'codex-websocket' as const;
  readonly displayName = 'Codex (WebSocket)';
  readonly connectionType = 'websocket' as const;
  readonly minVersion = '0.1.0';
  readonly hostEnvSignals = ['CODEX_APP_SERVER', 'OPENAI_API_KEY'] as const;

  readonly capabilities: AgentCapabilities = {
    agent: 'codex-websocket',
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
    runtimeHooks: createVirtualRuntimeHookCapabilities(),
    supportsThinking: false,
    thinkingEffortLevels: [],
    supportsThinkingBudgetTokens: false,
    supportsJsonMode: true,
    supportsStructuredOutput: true,
    structuredSessionTransport: 'persistent',
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
      { platform: 'all', type: 'npm', command: 'npm install -g @openai/codex-server' },
    ],
  };

  readonly models: ModelCapabilities[] = [
    {
      agent: 'codex-websocket',
      modelId: 'o4-mini',
      displayName: 'o4-mini (WebSocket)',
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
      inputPricePerMillion: 0.15,
      outputPricePerMillion: 0.6,
      cachedInputPricePerMillion: 0.075,
      cliArgKey: 'model',
      cliArgValue: 'o4-mini',
      lastUpdated: '2026-04-01',
      source: 'bundled',
    },
    {
      agent: 'codex-websocket',
      modelId: 'codex-mini-latest',
      displayName: 'Codex Mini (WebSocket)',
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
      inputPricePerMillion: 0.1,
      outputPricePerMillion: 0.4,
      cachedInputPricePerMillion: 0.05,
      cliArgKey: 'model',
      cliArgValue: 'codex-mini-latest',
      lastUpdated: '2026-04-01',
      source: 'bundled',
    },
  ];

  readonly defaultModelId = 'o4-mini';

  readonly configSchema: AgentConfigSchema = {
    agent: 'codex-websocket',
    version: 1,
    fields: [],
    configFilePaths: [path.join(os.homedir(), '.codex', 'config.json')],
    configFormat: 'json',
    supportsProjectConfig: false,
  };

  async connect(options: RunOptions): Promise<RemoteConnection> {
    // Get or start Codex app-server
    const serverInfo = await this.ensureServer();

    // Create WebSocket connection
    const connectionId = this.generateConnectionId();
    const websocketUrl = serverInfo.endpoint.replace('http', 'ws') + '/ws';

    const connection = new CodexWebSocketConnection({
      websocketUrl,
      connectionId,
    });

    await connection.connect();

    // Initialize chat session
    await connection.send({
      type: 'chat',
      prompt: Array.isArray(options.prompt) ? options.prompt.join('\n') : options.prompt,
      model: options.model || this.defaultModelId,
      stream: true,
      max_tokens: options.maxTokens,
      temperature: 0.1,
    });

    this.registerConnection(connection);
    return connection;
  }

  async disconnect(connection: RemoteConnection): Promise<void> {
    if (connection.connectionType === 'websocket') {
      await (connection as CodexWebSocketConnection).close();
      this.unregisterConnection(connection.connectionId);
    }
  }

  async startServer(): Promise<ServerInfo> {
    const serverId = this.generateServerId();
    const port = await this.findAvailablePort(8765);

    // In real implementation, this would start the actual Codex app-server
    // const serverProcess = spawn('codex-server', ['--port', port.toString(), '--host', '127.0.0.1']);

    const serverInfo: ServerInfo = {
      serverId,
      serverType: 'codex-websocket',
      endpoint: `http://127.0.0.1:${port}`,
      port,
      startedAt: new Date(),
    };

    // Simulate server startup delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    this.registerServer(serverInfo);
    return serverInfo;
  }

  async stopServer(serverInfo: ServerInfo): Promise<void> {
    // In real implementation, this would stop the Codex app-server process
    this.unregisterServer(serverInfo.serverId);
  }

  async healthCheck(serverInfo: ServerInfo): Promise<{ status: 'healthy' | 'unhealthy' | 'starting'; lastCheck: Date; details?: string }> {
    try {
      // In real implementation, this would check WebSocket connectivity
      // const ws = new WebSocket(serverInfo.endpoint.replace('http', 'ws') + '/health');

      return {
        status: 'healthy',
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async detectAuth(): Promise<AuthState> {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (apiKey) {
      return {
        status: 'authenticated',
        method: 'api_key',
        identity: `openai:...${apiKey.slice(-4)}`,
      };
    }

    // Check config files
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
      agent: 'codex-websocket',
      providerName: 'OpenAI',
      steps: [
        {
          step: 1,
          description: 'Get an API key from https://platform.openai.com/api-keys',
          url: 'https://platform.openai.com/api-keys'
        },
        {
          step: 2,
          description: 'Set the OPENAI_API_KEY environment variable',
          command: 'export OPENAI_API_KEY=sk-...'
        },
        {
          step: 3,
          description: 'Install the Codex app-server',
          command: 'npm install -g @openai/codex-server'
        },
      ],
      envVars: [
        { name: 'OPENAI_API_KEY', description: 'OpenAI API key', required: true, exampleFormat: 'sk-...' },
        { name: 'CODEX_APP_SERVER', description: 'Codex app-server endpoint URL', required: false, exampleFormat: 'http://localhost:8765' },
      ],
      documentationUrls: ['https://developers.openai.com/codex/app-server'],
      verifyCommand: 'codex-server --version',
    };
  }

  sessionDir(_cwd?: string): string {
    return path.join(os.homedir(), '.codex', 'sessions');
  }

  async parseSessionFile(filePath: string): Promise<Session> {
    const parsed = await parseCodexSessionFile(filePath, 'codex-websocket');
    return { ...parsed, agent: 'codex-websocket' };
  }

  async listSessionFiles(_cwd?: string): Promise<string[]> {
    return listJsonlFiles(this.sessionDir());
  }

  async readConfig(_cwd?: string): Promise<AgentConfig> {
    const filePath = this.configSchema.configFilePaths?.[0];
    if (!filePath) return { agent: 'codex-websocket', source: 'global' };
    const data = (await readJsonFile<Record<string, unknown>>(filePath)) ?? {};
    return { agent: 'codex-websocket', source: 'global', filePaths: [filePath], ...data };
  }

  async writeConfig(config: Partial<AgentConfig>, _cwd?: string): Promise<void> {
    const filePath = this.configSchema.configFilePaths?.[0];
    if (!filePath) return;
    const existing = (await readJsonFile<Record<string, unknown>>(filePath)) ?? {};
    const { agent: _a, source: _s, filePaths: _fp, ...rest } = config as Record<string, unknown>;
    void _a; void _s; void _fp;
    await writeJsonFileAtomic(filePath, { ...existing, ...rest });
  }

  // ── Private helper methods ──────────────────────────────────────────

  /**
   * Ensure a Codex app-server is running, starting one if needed.
   */
  protected async ensureServer(): Promise<ServerInfo> {
    // Check if we already have a running server
    for (const server of this.managedServers.values()) {
      if (server.serverType === 'codex-websocket') {
        const health = await this.healthCheck?.(server);
        if (health?.status === 'healthy') {
          return server;
        }
      }
    }

    // Start a new server
    return await this.startServer();
  }
}
