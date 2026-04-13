/**
 * Mock implementations for programmatic adapters (SDK-based).
 *
 * Provides realistic simulation of SDK behavior for:
 * - Claude Agent SDK
 * - Codex SDK
 * - Pi SDK
 * - Generic programmatic adapters
 */

import type { AgentEvent, RunOptions } from '@a5c-ai/agent-mux-core';
import type {
  ProgrammaticMockConfig,
  ProgrammaticMockResponse,
  ProgrammaticMockBuilder,
  MockStreamEvent,
} from './mock-types.js';

// ---------------------------------------------------------------------------
// Mock Event Utilities
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateRunId(): string {
  return `mock_run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function createBaseEvent(type: string, runId: string, agent = 'mock-agent') {
  return {
    timestamp: new Date().toISOString(),
    runId,
    type,
    agent,
  };
}

// ---------------------------------------------------------------------------
// Programmatic Mock Builder
// ---------------------------------------------------------------------------

export class ProgrammaticMockBuilderImpl implements ProgrammaticMockBuilder {
  private config: Partial<ProgrammaticMockConfig> = {
    authSucceeds: true,
    events: [],
    startDelayMs: 0,
  };

  name(name: string): this {
    this.config.name = name;
    return this;
  }

  withAuth(succeeds: boolean): this {
    this.config.authSucceeds = succeeds;
    return this;
  }

  addEvents(events: MockStreamEvent[]): this {
    this.config.events = [...(this.config.events || []), ...events];
    return this;
  }

  addEvent(type: string, data: Record<string, unknown>, delayMs = 0): this {
    const event: MockStreamEvent = { type, data, delayMs };
    this.config.events = [...(this.config.events || []), event];
    return this;
  }

  addTextStream(text: string, chunkSize = 10, delayBetweenChunks = 50): this {
    const chunks = [];
    let accumulated = '';

    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      accumulated += chunk;

      chunks.push({
        type: 'text_delta',
        data: {
          delta: chunk,
          accumulated,
        },
        delayMs: i === 0 ? 100 : delayBetweenChunks, // First chunk has longer delay
      });
    }

    return this.addEvents(chunks);
  }

  addToolCall(toolName: string, input: string, output: unknown, processingTimeMs = 200): this {
    const toolCallId = `tool_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const events: MockStreamEvent[] = [
      {
        type: 'tool_call_start',
        data: {
          toolCallId,
          toolName,
        },
        delayMs: 50,
      },
      {
        type: 'tool_input_delta',
        data: {
          toolCallId,
          delta: input,
          inputAccumulated: input,
        },
        delayMs: 30,
      },
      {
        type: 'tool_call_ready',
        data: {
          toolCallId,
          toolName,
          input,
        },
        delayMs: 20,
      },
      {
        type: 'tool_result',
        data: {
          toolCallId,
          toolName,
          output,
          durationMs: processingTimeMs,
        },
        delayMs: processingTimeMs,
      },
    ];

    return this.addEvents(events);
  }

  addThinking(thinkingContent: string, delayMs = 100): this {
    const events: MockStreamEvent[] = [
      {
        type: 'thinking_start',
        data: {},
        delayMs: 50,
      },
      {
        type: 'thinking_delta',
        data: {
          delta: thinkingContent,
          accumulated: thinkingContent,
        },
        delayMs,
      },
      {
        type: 'thinking_stop',
        data: {
          accumulated: thinkingContent,
        },
        delayMs: 30,
      },
    ];

    return this.addEvents(events);
  }

  withCost(inputTokens: number, outputTokens: number, thinkingTokens = 0): this {
    // Calculate realistic cost based on tokens
    const inputCost = inputTokens * 0.015 / 1000; // $0.015 per 1K tokens
    const outputCost = outputTokens * 0.075 / 1000; // $0.075 per 1K tokens
    const thinkingCost = thinkingTokens * 0.015 / 1000; // Same as input
    const totalUsd = inputCost + outputCost + thinkingCost;

    this.config.cost = {
      inputTokens,
      outputTokens,
      thinkingTokens,
      totalUsd,
    };

    return this;
  }

  withError(code: string, message: string, delayMs = 100): this {
    this.config.simulateError = {
      errorCode: code,
      message,
      delayMs,
    };
    return this;
  }

  build(): ProgrammaticMockConfig {
    return {
      authSucceeds: true,
      events: [],
      ...this.config,
    } as ProgrammaticMockConfig;
  }
}

// ---------------------------------------------------------------------------
// Mock Execution Engine
// ---------------------------------------------------------------------------

export class ProgrammaticMockEngine {
  async execute(
    config: ProgrammaticMockConfig,
    options: RunOptions
  ): Promise<AsyncIterableIterator<AgentEvent>> {
    const runId = generateRunId();
    const startTime = Date.now();

    return this.createEventStream(config, runId, startTime, options);
  }

  private async *createEventStream(
    config: ProgrammaticMockConfig,
    runId: string,
    startTime: number,
    options: RunOptions
  ): AsyncIterableIterator<AgentEvent> {
    try {
      // Authentication check
      if (!config.authSucceeds) {
        yield {
          ...createBaseEvent('error', runId, options.agent as string),
          code: 'AUTH_MISSING',
          message: 'Mock authentication failed',
          fatal: false,
          recoverable: false,
        } as unknown as AgentEvent;
        return;
      }

      // Session start
      yield {
        ...createBaseEvent('session_start', runId, options.agent as string),
        sessionId: `mock_session_${runId}`,
        turnCount: 0,
      } as unknown as AgentEvent;

      // Initial delay
      if (config.startDelayMs) {
        await delay(config.startDelayMs);
      }

      // Error simulation
      if (config.simulateError) {
        if (config.simulateError.delayMs) {
          await delay(config.simulateError.delayMs);
        }

        yield {
          ...createBaseEvent('error', runId, options.agent as string),
          code: config.simulateError.errorCode,
          message: config.simulateError.message,
          fatal: true,
          recoverable: false,
        } as unknown as AgentEvent;
        return;
      }

      // Stream events
      for (const mockEvent of config.events) {
        if (mockEvent.delayMs) {
          await delay(mockEvent.delayMs);
        }

        yield {
          ...createBaseEvent(mockEvent.type, runId, options.agent as string),
          ...mockEvent.data,
        } as unknown as AgentEvent;
      }

      // Cost event (if configured)
      if (config.cost) {
        yield {
          ...createBaseEvent('cost', runId, options.agent as string),
          cost: config.cost,
        } as unknown as AgentEvent;
      }

      // Message stop
      yield {
        ...createBaseEvent('message_stop', runId, options.agent as string),
      } as unknown as AgentEvent;

    } catch (error) {
      yield {
        ...createBaseEvent('error', runId, options.agent as string),
        code: 'INTERNAL',
        message: error instanceof Error ? error.message : String(error),
        fatal: true,
        recoverable: false,
      } as unknown as AgentEvent;
    }
  }
}

// ---------------------------------------------------------------------------
// Adapter-Specific Mock Factories
// ---------------------------------------------------------------------------

export class ClaudeAgentSdkMock {
  static basicSuccess(): ProgrammaticMockConfig {
    return new ProgrammaticMockBuilderImpl()
      .name('claude-agent-sdk-basic')
      .withAuth(true)
      .addThinking('I need to help the user with their request...')
      .addTextStream('Hello! I can help you with that.')
      .withCost(50, 20, 15)
      .build();
  }

  static toolCalling(): ProgrammaticMockConfig {
    return new ProgrammaticMockBuilderImpl()
      .name('claude-agent-sdk-tools')
      .withAuth(true)
      .addThinking('I should use the read_file tool to get the information...')
      .addToolCall('read_file', '{"path": "/tmp/test.txt"}', 'File contents here')
      .addTextStream('Based on the file contents, here is my response...')
      .withCost(75, 45, 25)
      .build();
  }

  static authFailure(): ProgrammaticMockConfig {
    return new ProgrammaticMockBuilderImpl()
      .name('claude-agent-sdk-auth-fail')
      .withAuth(false)
      .build();
  }
}

export class CodexSdkMock {
  static basicSuccess(): ProgrammaticMockConfig {
    return new ProgrammaticMockBuilderImpl()
      .name('codex-sdk-basic')
      .withAuth(true)
      .addTextStream('```python\ndef hello():\n    print("Hello, World!")\n```')
      .withCost(40, 60)
      .build();
  }

  static codeGeneration(): ProgrammaticMockConfig {
    return new ProgrammaticMockBuilderImpl()
      .name('codex-sdk-codegen')
      .withAuth(true)
      .addToolCall('code_execute', '{"code": "print(\\"test\\")"}', 'test')
      .addTextStream('The code executed successfully and produced the output above.')
      .withCost(80, 35)
      .build();
  }
}

export class PiSdkMock {
  static basicSuccess(): ProgrammaticMockConfig {
    return new ProgrammaticMockBuilderImpl()
      .name('pi-sdk-basic')
      .withAuth(true)
      .addTextStream('I understand your question. Let me help you with that.')
      .withCost(30, 25)
      .build();
  }

  static webSearch(): ProgrammaticMockConfig {
    return new ProgrammaticMockBuilderImpl()
      .name('pi-sdk-web-search')
      .withAuth(true)
      .addToolCall('search_web', '{"query": "latest news"}', [
        { title: 'News Article 1', url: 'https://example.com/1' },
        { title: 'News Article 2', url: 'https://example.com/2' },
      ])
      .addTextStream('Based on the search results, here are the latest news...')
      .withCost(45, 40)
      .build();
  }
}

// ---------------------------------------------------------------------------
// Factory Implementation
// ---------------------------------------------------------------------------

export function createProgrammaticMockBuilder(): ProgrammaticMockBuilder {
  return new ProgrammaticMockBuilderImpl();
}

export const programmaticMocks = {
  claude: ClaudeAgentSdkMock,
  codex: CodexSdkMock,
  pi: PiSdkMock,
  engine: new ProgrammaticMockEngine(),
  builder: createProgrammaticMockBuilder,
};