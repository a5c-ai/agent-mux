/**
 * WebSocket connection + mock response simulator for CodexWebSocketAdapter.
 * Extracted to keep codex-websocket-adapter.ts under the 400-line cap.
 */

import { EventEmitter } from 'node:events';

import type { AgentEvent, WebSocketConnection } from '@a5c-ai/agent-mux-core';

export interface CodexWebSocketMessage {
  id: string;
  type: 'request' | 'response' | 'event' | 'error';
  payload: unknown;
  timestamp: number;
}

export interface CodexChatRequest {
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

export interface CodexStreamEvent {
  id: string;
  type: 'text_delta' | 'tool_call' | 'tool_result' | 'error' | 'done';
  data: unknown;
}

export class CodexWebSocketConnection implements WebSocketConnection {
  readonly connectionId: string;
  readonly connectionType = 'websocket' as const;
  readonly websocketUrl: string;
  readonly endpoint: string;

  private ws: any;
  private eventEmitter = new EventEmitter();
  private messageQueue: CodexWebSocketMessage[] = [];
  private subscriptions = new Map<string, Set<string>>();
  private connected = false;
  private requestId = 0;

  constructor(options: { websocketUrl: string; connectionId: string }) {
    this.websocketUrl = options.websocketUrl;
    this.connectionId = options.connectionId;
    this.endpoint = options.websocketUrl;
  }

  async connect(): Promise<void> {
    this.ws = {
      readyState: 1,
      send: (data: string) => {
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
    if (!this.connected) throw new Error('WebSocket not connected');
    const message: CodexWebSocketMessage = {
      id: `msg_${++this.requestId}`,
      type: 'request',
      payload: data,
      timestamp: Date.now(),
    };
    this.ws.send(JSON.stringify(message));
  }

  async *receive(): AsyncIterableIterator<AgentEvent> {
    if (!this.connected) await this.connect();
    for (const message of this.messageQueue) {
      const event = this.parseMessageToEvent(message);
      if (event) yield event;
    }
    this.messageQueue = [];
    const messageHandler = (message: CodexWebSocketMessage) => {
      const event = this.parseMessageToEvent(message);
      if (event) this.eventEmitter.emit('agentEvent', event);
    };
    this.eventEmitter.on('message', messageHandler);
    try {
      while (this.connected) {
        const event = await new Promise<AgentEvent>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Receive timeout')), 30000);
          this.eventEmitter.once('agentEvent', (ev: AgentEvent) => {
            clearTimeout(timeout);
            resolve(ev);
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
    if (!this.subscriptions.has(channel)) this.subscriptions.set(channel, new Set());
    this.subscriptions.get(channel)!.add(subscriptionId);
    this.send({ type: 'subscribe', channel, subscriptionId }).catch(() => {});
    const self = this;
    return {
      async *[Symbol.asyncIterator]() {
        for await (const event of self.receive()) {
          if (
            event.type === 'debug' &&
            typeof event.message === 'string' &&
            event.message.includes(channel)
          ) {
            yield event;
          }
        }
      },
      next: async () => {
        throw new Error('Use for-await-of loop instead of calling next() directly');
      },
    };
  }

  async unsubscribe(channel: string): Promise<void> {
    const subs = this.subscriptions.get(channel);
    if (subs) {
      for (const subId of subs) {
        await this.send({ type: 'unsubscribe', channel, subscriptionId: subId });
      }
      this.subscriptions.delete(channel);
    }
  }

  async close(): Promise<void> {
    this.connected = false;
    if (this.ws) this.ws.close();
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
        case 'text_delta': {
          const d = payload.data as { delta: string; accumulated: string };
          return { ...base, type: 'text_delta', delta: d.delta, accumulated: d.accumulated } as AgentEvent;
        }
        case 'tool_call': {
          const d = payload.data as { id: string; name: string; arguments: string };
          return {
            ...base,
            type: 'tool_call_start',
            toolCallId: d.id,
            toolName: d.name,
            inputAccumulated: d.arguments,
          } as AgentEvent;
        }
        case 'tool_result': {
          const d = payload.data as { id: string; name: string; output: unknown };
          return {
            ...base,
            type: 'tool_result',
            toolCallId: d.id,
            toolName: d.name,
            output: d.output,
            durationMs: 0,
          } as AgentEvent;
        }
        case 'error': {
          const d = payload.data as { message: string; code?: string };
          return {
            ...base,
            type: 'error',
            code: d.code || 'WEBSOCKET_ERROR',
            message: d.message,
            recoverable: false,
          } as AgentEvent;
        }
        case 'done': {
          const d = payload.data as {
            text: string;
            usage?: { total_tokens: number; prompt_tokens: number; completion_tokens: number };
          };
          const events: AgentEvent[] = [
            { ...base, type: 'message_stop', text: d.text } as AgentEvent,
          ];
          if (d.usage) {
            events.push({
              ...base,
              type: 'cost',
              cost: {
                totalUsd: 0,
                inputTokens: d.usage.prompt_tokens,
                outputTokens: d.usage.completion_tokens,
              },
            } as AgentEvent);
          }
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
    }
    return null;
  }

  private handleMockResponse(request: CodexWebSocketMessage): void {
    if (request.type === 'request' && typeof request.payload === 'object') {
      const payload = request.payload as any;
      if (payload.type === 'chat') this.simulateChatResponse(request.id, payload);
    }
  }

  private simulateChatResponse(requestId: string, _chatRequest: any): void {
    const events = [
      { type: 'text_delta', data: { delta: "I'll help you with that. ", accumulated: "I'll help you with that. " } },
      { type: 'text_delta', data: { delta: 'Let me execute some code.', accumulated: "I'll help you with that. Let me execute some code." } },
      {
        type: 'tool_call',
        data: {
          id: 'call_123',
          name: 'execute_code',
          arguments: JSON.stringify({ language: 'python', code: 'print("Hello from WebSocket!")' }),
        },
      },
      {
        type: 'tool_result',
        data: { id: 'call_123', name: 'execute_code', output: 'Hello from WebSocket!' },
      },
      {
        type: 'done',
        data: {
          text: "I'll help you with that. Let me execute some code.",
          usage: { total_tokens: 150, prompt_tokens: 100, completion_tokens: 50 },
        },
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
