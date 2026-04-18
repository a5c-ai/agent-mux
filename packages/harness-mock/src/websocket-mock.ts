/**
 * WebSocket server mock implementation for harness-mock.
 */

import { EventEmitter } from 'node:events';
import type {
  FileOperation,
  HarnessScenario,
  MockExecutionResult,
  WebSocketServerMockHandle,
  WebSocketServerResult,
} from './types.js';

interface MockConnectionState {
  connectionId: string;
  connectedAt: Date;
  disconnectedAt?: Date;
  messageCount: number;
  timers: ReturnType<typeof setTimeout>[];
}

let nextConnectionId = 1;

export class WebSocketServerMock extends EventEmitter implements WebSocketServerMockHandle {
  readonly scenario: HarnessScenario;
  readonly id: number;
  readonly serverUrl: string;
  readonly port: number;

  private _exited = false;
  private _isRunning = false;
  private _startTime = Date.now();
  private _fileChanges: FileOperation[] = [];
  private readonly _messageHistory: Array<{
    connectionId: string;
    direction: 'inbound' | 'outbound';
    message: unknown;
    timestamp: Date;
  }> = [];
  private readonly _connections = new Map<string, MockConnectionState>();

  constructor(scenario: HarnessScenario, id: number) {
    super();
    this.scenario = scenario;
    this.id = id;
    this.port = scenario.websocketServer?.port ?? 8081;
    this.serverUrl = `ws://localhost:${this.port}`;
  }

  get exited(): boolean {
    return this._exited;
  }

  get fileChanges(): FileOperation[] {
    return [...this._fileChanges];
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  get connectionCount(): number {
    return this._connections.size;
  }

  get messageHistory() {
    return [...this._messageHistory];
  }

  async start(): Promise<void> {
    if (this._isRunning) {
      throw new Error('WebSocket server already started');
    }

    const config = this.scenario.websocketServer;
    if (config?.startupDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, config.startupDelayMs));
    }
    if (config?.startupFails) {
      throw new Error('Mock WebSocket server startup failed');
    }

    this._isRunning = true;
    this.emit('started');

    const defaultConnection = this.createConnection();
    this.emit('connection', defaultConnection.connectionId);
    this.scheduleScenarioEvents(defaultConnection);
  }

  broadcast(message: unknown): void {
    for (const connectionId of this._connections.keys()) {
      this.sendTo(connectionId, message);
    }
  }

  sendTo(connectionId: string, message: unknown): void {
    const connection = this._connections.get(connectionId);
    if (!connection) {
      throw new Error(`Unknown connection: ${connectionId}`);
    }
    if (connection.disconnectedAt) {
      throw new Error(`Connection already closed: ${connectionId}`);
    }
    this.recordMessage(connection, 'outbound', message);
    this.emit('message', { connectionId, direction: 'outbound', message });
  }

  receiveFrom(connectionId: string, message: unknown): void {
    const connection = this._connections.get(connectionId);
    if (!connection) {
      throw new Error(`Unknown connection: ${connectionId}`);
    }
    if (connection.disconnectedAt) {
      throw new Error(`Connection already closed: ${connectionId}`);
    }
    this.recordMessage(connection, 'inbound', message);
    this.emit('message', { connectionId, direction: 'inbound', message });
  }

  dropConnection(connectionId: string): void {
    const connection = this._connections.get(connectionId);
    if (!connection || connection.disconnectedAt) {
      return;
    }
    connection.disconnectedAt = new Date();
    for (const timer of connection.timers) {
      clearTimeout(timer);
    }
    connection.timers.length = 0;
    this._connections.delete(connectionId);
    this.emit('disconnected', connectionId);

    const drops = this.scenario.websocketServer?.simulateDrops;
    if (drops?.reconnectDelayMs != null) {
      const timer = setTimeout(() => {
        if (!this._isRunning) return;
        const replacement = this.createConnection();
        this.emit('reconnected', replacement.connectionId);
        this.scheduleScenarioEvents(replacement);
      }, drops.reconnectDelayMs);
      connection.timers.push(timer);
    }
  }

  getConnectionStatus() {
    return Array.from(this._connections.values()).map((connection) => ({
      connectionId: connection.connectionId,
      connectedAt: connection.connectedAt,
      messageCount: connection.messageCount,
    }));
  }

  async stop(): Promise<void> {
    if (!this._isRunning) {
      this._exited = true;
      return;
    }
    this._isRunning = false;
    for (const connection of this._connections.values()) {
      for (const timer of connection.timers) {
        clearTimeout(timer);
      }
      connection.timers.length = 0;
      connection.disconnectedAt ??= new Date();
    }
    this._connections.clear();
    this._exited = true;
    this.emit('stopped');
  }

  forceStop(): void {
    void this.stop();
  }

  async waitForCompletion(): Promise<MockExecutionResult> {
    if (!this._exited) {
      await new Promise<void>((resolve) => this.once('stopped', resolve));
    }

    const durationMs = Date.now() - this._startTime;
    const completedConnections = this.messageHistory.length === 0
      ? []
      : this.getHistoricalConnections();
    const averageConnectionDurationMs = completedConnections.length === 0
      ? durationMs
      : completedConnections.reduce((sum, connection) => sum + connection.durationMs, 0) / completedConnections.length;

    const result: WebSocketServerResult = {
      type: 'websocket',
      connectionCount: completedConnections.length,
      messageCount: this._messageHistory.length,
      averageConnectionDurationMs,
    };

    return {
      success: true,
      durationMs,
      results: result,
    };
  }

  private createConnection(): MockConnectionState {
    const connectionId = `ws-${nextConnectionId++}`;
    const connection: MockConnectionState = {
      connectionId,
      connectedAt: new Date(),
      messageCount: 0,
      timers: [],
    };
    this._connections.set(connectionId, connection);
    return connection;
  }

  private scheduleScenarioEvents(connection: MockConnectionState): void {
    for (const event of this.scenario.events ?? []) {
      const timer = setTimeout(() => {
        if (!this._isRunning || !this._connections.has(connection.connectionId)) {
          return;
        }
        this.recordMessage(connection, 'outbound', event);
        this.emit('event', { connectionId: connection.connectionId, event });

        const drops = this.scenario.websocketServer?.simulateDrops;
        if (drops?.afterMessages != null && connection.messageCount >= drops.afterMessages) {
          this.dropConnection(connection.connectionId);
        }
      }, event.delayMs ?? 0);
      connection.timers.push(timer);
    }

    for (const op of this.scenario.fileOperations ?? []) {
      this._fileChanges.push(op);
    }
  }

  private recordMessage(
    connection: MockConnectionState,
    direction: 'inbound' | 'outbound',
    message: unknown,
  ): void {
    connection.messageCount += 1;
    this._messageHistory.push({
      connectionId: connection.connectionId,
      direction,
      message,
      timestamp: new Date(),
    });
  }

  private getHistoricalConnections(): Array<{ connectionId: string; durationMs: number }> {
    const byConnection = new Map<string, { first: Date; last: Date }>();
    for (const item of this._messageHistory) {
      const existing = byConnection.get(item.connectionId);
      if (!existing) {
        byConnection.set(item.connectionId, { first: item.timestamp, last: item.timestamp });
        continue;
      }
      existing.last = item.timestamp;
    }
    return Array.from(byConnection.entries()).map(([connectionId, range]) => ({
      connectionId,
      durationMs: Math.max(0, range.last.getTime() - range.first.getTime()),
    }));
  }
}
