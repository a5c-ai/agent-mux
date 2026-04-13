/**
 * OpenCodeHttpAdapter — HTTP server-based OpenCode integration.
 *
 * Uses 'opencode serve' + REST API for full OpenCode capabilities including
 * real-time streaming via Server-Sent Events (SSE).
 */

import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';

import type {
  AgentCapabilities,
  ModelCapabilities,
  AgentConfigSchema,
  AuthState,
  AuthSetupGuidance,
  Session,
  RunOptions,
  RemoteConnection,
  HttpConnection,
  ServerOptions,
  ServerInfo,
  ServerHealth,
  AgentEvent,
  AgentConfig,
  CostRecord,
  InstalledPlugin,
  PluginInstallOptions,
} from '@a5c-ai/agent-mux-core';

import { BaseRemoteAdapter } from './remote-adapter-base.js';
import { readAuthConfigIdentity } from './auth-config.js';
import { parseJsonlSessionFile, listJsonlFiles } from './session-fs.js';
import { mcpListPlugins, mcpInstallPlugin, mcpUninstallPlugin } from './mcp-plugins.js';

/**
 * HTTP-based OpenCode adapter using server mode for full capabilities.
 */
export class OpenCodeHttpAdapter extends BaseRemoteAdapter {
  readonly agent = 'opencode-http' as const;
  readonly displayName = 'OpenCode (HTTP)';
  readonly connectionType = 'http' as const;
  readonly minVersion = '0.1.0';
  readonly hostEnvSignals = ['OPENCODE_SESSION_ID', 'OPENCODE_CONFIG'] as const;

  readonly capabilities: AgentCapabilities = {
    agent: 'opencode-http',
    canResume: true,
    canFork: true,
    supportsMultiTurn: true,
    sessionPersistence: 'file',
    supportsTextStreaming: true,
    supportsToolCallStreaming: true,
    supportsThinkingStreaming: false,
    supportsNativeTools: true,
    supportsMCP: true,
    supportsParallelToolCalls: true,
    requiresToolApproval: true,
    approvalModes: ['yolo', 'prompt'],
    supportsThinking: false,
    thinkingEffortLevels: [],
    supportsThinkingBudgetTokens: false,
    supportsJsonMode: true,
    supportsStructuredOutput: true,
    supportsSkills: true,
    supportsAgentsMd: true,
    skillsFormat: 'file',
    supportsSubagentDispatch: true,
    supportsParallelExecution: true,
    maxParallelTasks: 5,
    supportsInteractiveMode: true,
    supportsStdinInjection: true,
    supportsImageInput: true,
    supportsImageOutput: false,
    supportsFileAttachments: true,
    supportsPlugins: true,
    pluginFormats: ['mcp-server'],
    pluginRegistries: [{ name: 'mcp', url: 'https://modelcontextprotocol.io', searchable: false }],
    supportedPlatforms: ['darwin', 'linux', 'win32'],
    requiresGitRepo: false,
    requiresPty: false,
    authMethods: [
      { type: 'api_key', name: 'API Key', description: 'Provider API keys via opencode auth' },
      { type: 'oauth', name: 'OAuth', description: 'Provider OAuth via opencode auth' },
    ],
    authFiles: ['.config/opencode/config.json', '.opencode/config.json'],
    installMethods: [
      { platform: 'all', type: 'npm', command: 'npm install -g @anomalyco/opencode' },
      { platform: 'darwin', type: 'brew', command: 'brew install --cask opencode' },
      { platform: 'all', type: 'curl', command: 'curl -fsSL https://opencode.ai/install | bash' },
    ],
  };

  readonly models: ModelCapabilities[] = [
    {
      agent: 'opencode-http',
      modelId: 'claude-3-5-sonnet-20241022',
      modelAlias: 'claude-sonnet',
      displayName: 'Claude 3.5 Sonnet',
      deprecated: false,
      contextWindow: 200000,
      maxOutputTokens: 8192,
      inputPricePerMillion: 3,
      outputPricePerMillion: 15,
      supportsThinking: false,
      thinkingEffortLevels: [],
      supportsToolCalling: true,
      supportsParallelToolCalls: true,
      supportsToolCallStreaming: true,
      supportsJsonMode: true,
      supportsStructuredOutput: true,
      supportsTextStreaming: true,
      supportsThinkingStreaming: false,
      supportsImageInput: true,
      supportsImageOutput: false,
      supportsFileInput: true,
      cliArgKey: '--model',
      cliArgValue: 'claude-3-5-sonnet-20241022',
      lastUpdated: '2024-10-22',
      source: 'bundled',
    },
    {
      agent: 'opencode-http',
      modelId: 'gpt-4o',
      modelAlias: 'gpt-4o',
      displayName: 'GPT-4o',
      deprecated: false,
      contextWindow: 128000,
      maxOutputTokens: 4096,
      inputPricePerMillion: 2.5,
      outputPricePerMillion: 10,
      supportsThinking: false,
      thinkingEffortLevels: [],
      supportsToolCalling: true,
      supportsParallelToolCalls: true,
      supportsToolCallStreaming: true,
      supportsJsonMode: true,
      supportsStructuredOutput: true,
      supportsTextStreaming: true,
      supportsThinkingStreaming: false,
      supportsImageInput: true,
      supportsImageOutput: false,
      supportsFileInput: true,
      cliArgKey: '--model',
      cliArgValue: 'gpt-4o',
      lastUpdated: '2024-05-13',
      source: 'bundled',
    },
  ];

  readonly defaultModelId = 'claude-3-5-sonnet-20241022';

  readonly configSchema: AgentConfigSchema = {
    agent: 'opencode-http',
    version: 1,
    fields: [],
    configFilePaths: [path.join(os.homedir(), '.config', 'opencode', 'config.json')],
    configFormat: 'json',
    supportsProjectConfig: true,
  };

  async connect(options: RunOptions): Promise<HttpConnection> {
    // Ensure OpenCode server is running
    const serverInfo = await this.ensureServer();

    // Create HTTP connection to server
    const connection = new OpenCodeHttpConnection({
      connectionId: this.generateConnectionId(),
      baseUrl: serverInfo.endpoint,
      runOptions: options,
      adapter: this,
    });

    // Register for cleanup tracking
    this.registerConnection(connection);

    return connection;
  }

  async disconnect(connection: RemoteConnection): Promise<void> {
    await connection.close();
    this.unregisterConnection(connection.connectionId);
  }

  async startServer(options?: ServerOptions): Promise<ServerInfo> {
    const port = options?.port || await this.findAvailablePort(3000);
    const host = options?.host || 'localhost';

    const args = [
      'serve',
      '--port', String(port),
      '--host', host,
    ];

    // Add additional args if provided
    if (options?.args) {
      args.push(...options.args);
    }

    const serverProcess = spawn('opencode', args, {
      env: { ...process.env, ...options?.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const serverId = this.generateServerId();
    const endpoint = `http://${host}:${port}`;

    const serverInfo: ServerInfo = {
      serverId,
      serverType: 'opencode-http',
      endpoint,
      pid: serverProcess.pid,
      port,
      startedAt: new Date(),
    };

    // Wait for server to be ready
    await this.waitForServerReady(endpoint, options?.timeout || 30000);

    // Register server for tracking
    this.registerServer(serverInfo);

    return serverInfo;
  }

  async stopServer(serverInfo: ServerInfo): Promise<void> {
    if (serverInfo.pid) {
      try {
        process.kill(serverInfo.pid, 'SIGTERM');
        // Give it time to shut down gracefully
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        // Process might already be dead
      }
    }

    this.unregisterServer(serverInfo.serverId);
  }

  async healthCheck(serverInfo: ServerInfo): Promise<ServerHealth> {
    try {
      const response = await fetch(`${serverInfo.endpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return {
          status: 'healthy',
          uptime: Date.now() - serverInfo.startedAt.getTime(),
          lastCheck: new Date(),
        };
      } else {
        return {
          status: 'unhealthy',
          lastCheck: new Date(),
          details: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async detectAuth(): Promise<AuthState> {
    // Check for provider API keys in environment
    const anthropicKey = process.env['ANTHROPIC_API_KEY'];
    const openaiKey = process.env['OPENAI_API_KEY'];
    const googleKey = process.env['GOOGLE_API_KEY'];

    if (anthropicKey || openaiKey || googleKey) {
      const provider = anthropicKey ? 'anthropic' : openaiKey ? 'openai' : 'google';
      const key = anthropicKey || openaiKey || googleKey;
      return {
        status: 'authenticated',
        method: 'api_key',
        identity: `${provider}:...${key!.slice(-4)}`,
      };
    }

    // Check OpenCode configuration files
    const home = os.homedir();
    const found = await readAuthConfigIdentity([
      path.join(home, '.config', 'opencode', 'config.json'),
      path.join(home, '.opencode', 'config.json'),
    ]);
    if (found) {
      return { status: 'authenticated', method: found.method, identity: found.identity };
    }

    return { status: 'unauthenticated' };
  }

  getAuthGuidance(): AuthSetupGuidance {
    return {
      agent: 'opencode-http',
      providerName: 'OpenCode (HTTP)',
      steps: [
        { step: 1, description: 'Configure authentication using OpenCode CLI', command: 'opencode auth' },
        { step: 2, description: 'Alternatively, set provider API keys directly' },
        { step: 3, description: 'For Anthropic: export ANTHROPIC_API_KEY=sk-ant-...', command: 'export ANTHROPIC_API_KEY=sk-ant-...' },
        { step: 4, description: 'For OpenAI: export OPENAI_API_KEY=sk-...', command: 'export OPENAI_API_KEY=sk-...' },
        { step: 5, description: 'For Google: export GOOGLE_API_KEY=...', command: 'export GOOGLE_API_KEY=...' },
      ],
      envVars: [
        { name: 'ANTHROPIC_API_KEY', description: 'Anthropic API key', required: false },
        { name: 'OPENAI_API_KEY', description: 'OpenAI API key', required: false },
        { name: 'GOOGLE_API_KEY', description: 'Google API key', required: false },
      ],
      documentationUrls: ['https://github.com/anomalyco/opencode'],
      loginCommand: 'opencode auth',
      verifyCommand: 'opencode --version',
    };
  }

  sessionDir(_cwd?: string): string {
    return path.join(os.homedir(), '.config', 'opencode', 'sessions');
  }

  async parseSessionFile(filePath: string): Promise<Session> {
    const parsed = await parseJsonlSessionFile(filePath, 'opencode-http');
    return { ...parsed, agent: 'opencode-http' };
  }

  async listSessionFiles(_cwd?: string): Promise<string[]> {
    return listJsonlFiles(this.sessionDir());
  }

  async readConfig(_cwd?: string): Promise<AgentConfig> {
    const filePath = this.configSchema.configFilePaths?.[0];
    if (!filePath) return { agent: 'opencode-http', source: 'global' };

    try {
      const fs = await import('node:fs/promises');
      const data = await fs.readFile(filePath, 'utf8');
      const config = JSON.parse(data);
      return { agent: 'opencode-http', source: 'global', filePaths: [filePath], ...config };
    } catch {
      return { agent: 'opencode-http', source: 'global' };
    }
  }

  async writeConfig(config: Partial<AgentConfig>, _cwd?: string): Promise<void> {
    const filePath = this.configSchema.configFilePaths?.[0];
    if (!filePath) return;

    const fs = await import('node:fs/promises');
    const path_module = await import('node:path');

    // Ensure directory exists
    await fs.mkdir(path_module.dirname(filePath), { recursive: true });

    // Read existing config
    let existing = {};
    try {
      const data = await fs.readFile(filePath, 'utf8');
      existing = JSON.parse(data);
    } catch {
      // File doesn't exist or is invalid, start with empty config
    }

    // Remove agent-mux specific fields before writing
    const { agent: _a, source: _s, filePaths: _fp, ...rest } = config as Record<string, unknown>;
    void _a; void _s; void _fp;

    // Merge and write
    const merged = { ...existing, ...rest };
    await fs.writeFile(filePath, JSON.stringify(merged, null, 2), 'utf8');
  }

  // ── Plugin Management ─────────────────────────────────────────────

  private pluginsPath(): string {
    return this.configSchema.configFilePaths?.[0] ?? '';
  }

  async listPlugins(): Promise<InstalledPlugin[]> {
    return mcpListPlugins(this.pluginsPath());
  }

  async installPlugin(
    pluginId: string,
    options?: PluginInstallOptions,
  ): Promise<InstalledPlugin> {
    return mcpInstallPlugin(this.pluginsPath(), pluginId, options);
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    return mcpUninstallPlugin(this.pluginsPath(), pluginId);
  }

  // ── Private implementation ────────────────────────────────────────

  private async ensureServer(): Promise<ServerInfo> {
    // Check if we already have a running server
    for (const server of this.managedServers.values()) {
      const health = await this.healthCheck(server);
      if (health.status === 'healthy') {
        return server;
      }
    }

    // Need to start a new server
    return this.startServer();
  }

  private async waitForServerReady(endpoint: string, timeoutMs: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${endpoint}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(1000),
        });

        if (response.ok) {
          return; // Server is ready
        }
      } catch {
        // Server not ready yet, continue waiting
      }

      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    throw new Error(`OpenCode server did not become ready within ${timeoutMs}ms`);
  }
}

// ---------------------------------------------------------------------------
// HTTP Connection Implementation
// ---------------------------------------------------------------------------

interface OpenCodeHttpConnectionOptions {
  connectionId: string;
  baseUrl: string;
  runOptions: RunOptions;
  adapter: OpenCodeHttpAdapter;
}

class OpenCodeHttpConnection implements HttpConnection {
  readonly connectionType = 'http' as const;
  readonly connectionId: string;
  readonly baseUrl: string;
  readonly endpoint: string;

  private options: RunOptions;
  private adapter: OpenCodeHttpAdapter;
  private closed = false;

  constructor(options: OpenCodeHttpConnectionOptions) {
    this.connectionId = options.connectionId;
    this.baseUrl = options.baseUrl;
    this.endpoint = options.baseUrl;
    this.options = options.runOptions;
    this.adapter = options.adapter;
  }

  async send(data: unknown): Promise<void> {
    if (this.closed) throw new Error('Connection is closed');

    const response = await fetch(`${this.baseUrl}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Send failed: HTTP ${response.status}`);
    }
  }

  async get(path: string, params?: Record<string, unknown>): Promise<unknown> {
    if (this.closed) throw new Error('Connection is closed');

    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`GET ${path} failed: HTTP ${response.status}`);
    }

    return response.json();
  }

  async post(path: string, data?: unknown): Promise<unknown> {
    if (this.closed) throw new Error('Connection is closed');

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`POST ${path} failed: HTTP ${response.status}`);
    }

    return response.json();
  }

  async put(path: string, data?: unknown): Promise<unknown> {
    if (this.closed) throw new Error('Connection is closed');

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`PUT ${path} failed: HTTP ${response.status}`);
    }

    return response.json();
  }

  async delete(path: string): Promise<unknown> {
    if (this.closed) throw new Error('Connection is closed');

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`DELETE ${path} failed: HTTP ${response.status}`);
    }

    return response.json();
  }

  async *stream(path: string, data?: unknown): AsyncIterableIterator<AgentEvent> {
    if (this.closed) throw new Error('Connection is closed');

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Stream ${path} failed: HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.trim() && line.startsWith('data: ')) {
            try {
              const eventData = line.slice(6); // Remove 'data: ' prefix
              const parsed = JSON.parse(eventData);
              const event = this.parseServerSentEvent(parsed);
              if (event) yield event;
            } catch (error) {
              // Skip malformed events
              console.warn('Failed to parse SSE event:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async *receive(): AsyncIterableIterator<AgentEvent> {
    // Default implementation: stream chat with current options
    const requestData = {
      prompt: this.options.prompt,
      model: this.options.model || this.adapter.defaultModelId,
      sessionId: this.options.sessionId,
      maxTurns: this.options.maxTurns,
      systemPrompt: this.options.systemPrompt,
    };

    yield* this.stream('/api/chat/stream', requestData);
  }

  async close(): Promise<void> {
    this.closed = true;
    // HTTP connections are stateless, nothing to clean up
  }

  private parseServerSentEvent(data: Record<string, unknown>): AgentEvent | null {
    const ts = Date.now();
    const runId = this.connectionId; // Use connection ID as run ID
    const base = { runId, agent: this.adapter.agent, timestamp: ts };

    const type = data.type as string;
    const event = data.event as string;

    // Handle OpenCode's HTTP API event format
    if (event === 'message' || type === 'message') {
      const content = (data.content ?? data.data ?? '') as string;
      if (content) {
        return { ...base, type: 'text_delta', delta: content, accumulated: content } as AgentEvent;
      }
    }

    if (event === 'tool_start' || type === 'tool_start') {
      return {
        ...base,
        type: 'tool_call_start',
        toolCallId: (data.id ?? data.tool_id ?? '') as string,
        toolName: (data.name ?? data.tool_name ?? '') as string,
        inputAccumulated: JSON.stringify(data.input ?? data.arguments ?? {}),
      } as AgentEvent;
    }

    if (event === 'tool_result' || type === 'tool_result') {
      return {
        ...base,
        type: 'tool_result',
        toolCallId: (data.id ?? data.tool_id ?? '') as string,
        toolName: (data.name ?? data.tool_name ?? '') as string,
        output: data.result ?? data.output ?? '',
        durationMs: (data.duration ?? 0) as number,
      } as AgentEvent;
    }

    if (event === 'session_end' || type === 'session_end') {
      const events: AgentEvent[] = [];

      // Final message if present
      const finalMessage = (data.final_message ?? data.message ?? '') as string;
      if (finalMessage) {
        events.push({ ...base, type: 'message_stop', text: finalMessage } as AgentEvent);
      }

      // Cost information
      const usage = data.usage as Record<string, unknown> | undefined;
      if (usage) {
        const cost = this.extractCostFromUsage(usage);
        if (cost) {
          events.push({ ...base, type: 'cost', cost } as AgentEvent);
        }
      }

      return events.length > 0 ? (events.length === 1 ? events[0] : events as any) : null;
    }

    if (event === 'error' || type === 'error') {
      return {
        ...base,
        type: 'error',
        code: 'INTERNAL' as const,
        message: (data.message ?? data.error ?? 'Unknown error') as string,
        recoverable: (data.recoverable ?? false) as boolean,
      } as AgentEvent;
    }

    return null;
  }

  private extractCostFromUsage(usage: Record<string, unknown>): CostRecord | null {
    // Extract standard cost fields from OpenCode usage format
    const totalUsd = Number(usage.totalUsd || usage.total_usd || usage.cost || 0);
    const inputTokens = Number(usage.inputTokens || usage.input_tokens || usage.prompt_tokens || 0);
    const outputTokens = Number(usage.outputTokens || usage.output_tokens || usage.completion_tokens || 0);
    const cacheCreationTokens = usage.cacheCreationTokens || usage.cache_creation_tokens;
    const cacheReadTokens = usage.cacheReadTokens || usage.cache_read_tokens;

    if (totalUsd === 0 && inputTokens === 0 && outputTokens === 0) {
      return null;
    }

    const cost: CostRecord = {
      totalUsd,
      inputTokens,
      outputTokens,
    };

    if (cacheCreationTokens != null) cost.cacheCreationTokens = Number(cacheCreationTokens);
    if (cacheReadTokens != null) cost.cacheReadTokens = Number(cacheReadTokens);

    return cost;
  }
}