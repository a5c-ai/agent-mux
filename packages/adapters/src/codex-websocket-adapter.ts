/**
 * CodexWebSocketAdapter — WebSocket-based Codex adapter for real-time communication.
 *
 * Uses the Codex app-server architecture with WebSocket connections for
 * bidirectional real-time communication and enhanced streaming capabilities.
 */

import * as os from 'node:os';
import * as path from 'node:path';
import { EventEmitter } from 'node:events';

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
import {
  listJsonlFiles,
  parseJsonlSessionFile,
  readJsonFile,
  writeJsonFileAtomic,
} from './session-fs.js';
import { readAuthConfigIdentity } from './auth-config.js';

// WebSocket message types for Codex app-server protocol
interface CodexWebSocketMessage {
  id: string;
  type: 'request' | 'response' | 'event' | 'error';
  payload: unknown;
  timestamp: number;
}

interface CodexChatRequest {
  id: string;
  prompt: string;
  model?: string;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
}

interface CodexStreamEvent {
  id: string;
  type: 'text_delta' | 'tool_call' | 'tool_result' | 'error' | 'done';
  data: unknown;
}

export class CodexWebSocketConnection implements WebSocketConnection {
  readonly connectionId: string;
  readonly connectionType = 'websocket' as const;
  readonly websocketUrl: string;
  readonly endpoint: string;

  private ws: any; // WebSocket instance (would be imported from 'ws' or similar)
  private eventEmitter = new EventEmitter();
  private messageQueue: CodexWebSocketMessage[] = [];
  private subscriptions = new Map<string, Set<string>>();
  private connected = false;
  private requestId = 0;

  constructor(options: {
    websocketUrl: string;
    connectionId: string;
  }) {
    this.websocketUrl = options.websocketUrl;
    this.connectionId = options.connectionId;
    this.endpoint = options.websocketUrl;
  }

  async connect(): Promise<void> {
    // In real implementation, this would use actual WebSocket library
    // const WebSocket = require('ws');
    // this.ws = new WebSocket(this.websocketUrl);

    // Mock WebSocket connection
    this.ws = {
      readyState: 1, // OPEN
      send: (data: string) => {
        // Simulate WebSocket message sending
        setTimeout(() => {
          this.handleMockResponse(JSON.parse(data));
        }, 50);
      },
      close: () => {
        this.connected = false;
        this.eventEmitter.emit('close');
      },
      addEventListener: (event: string, handler: (...args: any[]) => void) => {
        this.eventEmitter.on(event, handler);
      },
    };

    this.connected = true;
    this.eventEmitter.emit('open');
  }

  async send(data: unknown): Promise<void> {
    if (!this.connected) {
      throw new Error('WebSocket not connected');
    }

    const message: CodexWebSocketMessage = {
      id: `msg_${++this.requestId}`,
      type: 'request',
      payload: data,
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
  }

  async *receive(): AsyncIterableIterator<AgentEvent> {
    if (!this.connected) {
      await this.connect();
    }

    // Yield queued messages
    for (const message of this.messageQueue) {
      const event = this.parseMessageToEvent(message);
      if (event) yield event;
    }
    this.messageQueue = [];

    // Set up real-time message handling
    const messageHandler = (message: CodexWebSocketMessage) => {
      const event = this.parseMessageToEvent(message);
      if (event) {
        this.eventEmitter.emit('agentEvent', event);
      }
    };

    this.eventEmitter.on('message', messageHandler);

    try {
      while (this.connected) {
        const event = await new Promise<AgentEvent>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Receive timeout'));
          }, 30000);

          this.eventEmitter.once('agentEvent', (event: AgentEvent) => {
            clearTimeout(timeout);
            resolve(event);
          });

          this.eventEmitter.once('close', () => {
            clearTimeout(timeout);
            reject(new Error('WebSocket closed'));
          });
        });

        yield event;
      }
    } finally {
      this.eventEmitter.off('message', messageHandler);
    }
  }

  subscribe(channel: string): AsyncIterableIterator<AgentEvent> {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(subscriptionId);

    // Send subscription message (fire and forget)
    this.send({
      type: 'subscribe',
      channel,
      subscriptionId,
    }).catch(() => {}); // Ignore errors for now

    // Return filtered iterator for this subscription
    const self = this;
    return {
      async *[Symbol.asyncIterator]() {
        for await (const event of self.receive()) {
          // Filter events for this specific subscription
          if (event.type === 'debug' &&
              typeof event.message === 'string' &&
              event.message.includes(channel)) {
            yield event;
          }
        }
      },
      next: async () => {
        // This method is required by AsyncIterableIterator but shouldn't be called directly
        throw new Error('Use for-await-of loop instead of calling next() directly');
      }
    };
  }

  async unsubscribe(channel: string): Promise<void> {
    const subs = this.subscriptions.get(channel);
    if (subs) {
      for (const subId of subs) {
        await this.send({
          type: 'unsubscribe',
          channel,
          subscriptionId: subId,
        });
      }
      this.subscriptions.delete(channel);
    }
  }

  async close(): Promise<void> {
    this.connected = false;
    if (this.ws) {
      this.ws.close();
    }
    this.eventEmitter.removeAllListeners();
  }

  private parseMessageToEvent(message: CodexWebSocketMessage): AgentEvent | null {
    const base = {
      runId: this.connectionId,
      agent: 'codex-websocket',
      timestamp: message.timestamp || Date.now(),
    };

    if (message.type === 'event' && typeof message.payload === 'object' && message.payload) {
      const payload = message.payload as CodexStreamEvent;

      switch (payload.type) {
        case 'text_delta':
          const textData = payload.data as { delta: string; accumulated: string };
          return {
            ...base,
            type: 'text_delta',
            delta: textData.delta,
            accumulated: textData.accumulated,
          } as AgentEvent;

        case 'tool_call':
          const toolData = payload.data as { id: string; name: string; arguments: string };
          return {
            ...base,
            type: 'tool_call_start',
            toolCallId: toolData.id,
            toolName: toolData.name,
            inputAccumulated: toolData.arguments,
          } as AgentEvent;

        case 'tool_result':
          const resultData = payload.data as { id: string; name: string; output: unknown };
          return {
            ...base,
            type: 'tool_result',
            toolCallId: resultData.id,
            toolName: resultData.name,
            output: resultData.output,
            durationMs: 0,
          } as AgentEvent;

        case 'error':
          const errorData = payload.data as { message: string; code?: string };
          return {
            ...base,
            type: 'error',
            code: errorData.code || 'WEBSOCKET_ERROR',
            message: errorData.message,
            recoverable: false,
          } as AgentEvent;

        case 'done':
          const doneData = payload.data as { text: string; usage?: { total_tokens: number; prompt_tokens: number; completion_tokens: number } };
          const events: AgentEvent[] = [
            {
              ...base,
              type: 'message_stop',
              text: doneData.text,
            } as AgentEvent,
          ];

          if (doneData.usage) {
            events.push({
              ...base,
              type: 'cost',
              cost: {
                totalUsd: 0, // Would calculate based on usage
                inputTokens: doneData.usage.prompt_tokens,
                outputTokens: doneData.usage.completion_tokens,
              },
            } as AgentEvent);
          }

          // Return first event, queue the rest
          if (events.length > 1) {
            for (let i = 1; i < events.length; i++) {
              this.messageQueue.push({
                id: message.id,
                type: 'event',
                payload: events[i],
                timestamp: Date.now(),
              });
            }
          }
          return events[0];
      }
    }

    return null;
  }

  private handleMockResponse(request: CodexWebSocketMessage): void {
    // Simulate app-server responses based on request
    if (request.type === 'request' && typeof request.payload === 'object') {
      const payload = request.payload as any;

      if (payload.type === 'chat') {
        this.simulateChatResponse(request.id, payload);
      }
    }
  }

  private simulateChatResponse(requestId: string, chatRequest: any): void {
    const events = [
      { type: 'text_delta', data: { delta: 'I\'ll help you with that. ', accumulated: 'I\'ll help you with that. ' } },
      { type: 'text_delta', data: { delta: 'Let me execute some code.', accumulated: 'I\'ll help you with that. Let me execute some code.' } },
      {
        type: 'tool_call',
        data: {
          id: 'call_123',
          name: 'execute_code',
          arguments: JSON.stringify({ language: 'python', code: 'print("Hello from WebSocket!")' })
        }
      },
      {
        type: 'tool_result',
        data: {
          id: 'call_123',
          name: 'execute_code',
          output: 'Hello from WebSocket!'
        }
      },
      {
        type: 'done',
        data: {
          text: 'I\'ll help you with that. Let me execute some code.',
          usage: { total_tokens: 150, prompt_tokens: 100, completion_tokens: 50 }
        }
      },
    ];

    events.forEach((event, index) => {
      setTimeout(() => {
        const message: CodexWebSocketMessage = {
          id: `${requestId}_${index}`,
          type: 'event',
          payload: event,
          timestamp: Date.now(),
        };
        this.eventEmitter.emit('message', message);
      }, (index + 1) * 200);
    });
  }
}

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
    const parsed = await parseJsonlSessionFile(filePath, 'codex-websocket');
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