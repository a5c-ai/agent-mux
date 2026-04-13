// @ts-nocheck -- TODO(observability): fix Logger interface extension
/**
 * Structured logging with Pino for agent-mux.
 *
 * Provides contextual logging for agents, runs, sessions, and operations
 * with configurable output formats and log levels.
 */

import pino from 'pino';
import type { Logger as PinoLogger } from 'pino';

/**
 * Log levels supported by the system.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Contextual information that can be attached to log entries.
 */
export interface LogContext {
  /** Run ID for correlating logs across a single run */
  runId?: string;
  /** Agent name being used */
  agent?: string;
  /** Session ID for multi-turn conversations */
  sessionId?: string;
  /** Model being used */
  model?: string;
  /** User ID or identifier */
  userId?: string;
  /** Request/operation ID for tracing */
  operationId?: string;
  /** Component or module name */
  component?: string;
  /** Duration in milliseconds for performance tracking */
  duration?: number;
  /** Cost information */
  cost?: {
    totalUsd?: number;
    inputTokens?: number;
    outputTokens?: number;
    thinkingTokens?: number;
  };
  /** Error information */
  error?: {
    code?: string;
    message?: string;
    stack?: string;
    recoverable?: boolean;
  };
  /** Additional arbitrary metadata */
  [key: string]: unknown;
}

/**
 * Logger configuration options.
 */
export interface LoggerConfig {
  /** Log level threshold */
  level?: LogLevel;
  /** Enable pretty printing for development */
  pretty?: boolean;
  /** Enable structured JSON output */
  structured?: boolean;
  /** Include timestamps in logs */
  timestamp?: boolean;
  /** Include source location (file:line) in logs */
  includeSource?: boolean;
  /** Base context to include in all logs */
  baseContext?: LogContext;
  /** Custom pino options */
  pinoOptions?: pino.LoggerOptions;
}

/**
 * Enhanced logger interface with agent-mux specific methods.
 * Combines Pino logger capabilities with domain-specific logging methods.
 */
export interface Logger {
  // Core Pino logger methods
  trace(msg: string, ...args: unknown[]): void;
  trace(obj: object, msg?: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  debug(obj: object, msg?: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  info(obj: object, msg?: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  warn(obj: object, msg?: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  error(obj: object, msg?: string, ...args: unknown[]): void;
  fatal(msg: string, ...args: unknown[]): void;
  fatal(obj: object, msg?: string, ...args: unknown[]): void;

  /** Create a child logger with additional context */
  child(context: LogContext): Logger;

  /** Log agent run start */
  runStart(context: { runId: string; agent: string; prompt: string; model?: string }): void;

  /** Log agent run completion */
  runComplete(context: { runId: string; agent: string; duration: number; cost?: LogContext['cost'] }): void;

  /** Log agent run error */
  runError(context: { runId: string; agent: string; error: Error | LogContext['error'] }): void;

  /** Log tool call start */
  toolCallStart(context: { runId: string; toolName: string; toolCallId: string; args?: unknown }): void;

  /** Log tool call completion */
  toolCallComplete(context: { runId: string; toolName: string; toolCallId: string; duration: number; result?: unknown }): void;

  /** Log performance metrics */
  perf(message: string, context: LogContext & { duration: number }): void;

  /** Log authentication events */
  auth(message: string, context: LogContext & { method?: string; success?: boolean }): void;

  /** Log configuration events */
  config(message: string, context: LogContext): void;

  /** Log session events */
  session(message: string, context: LogContext & { action?: 'create' | 'resume' | 'fork' | 'end' }): void;
}

/**
 * Default logger configuration.
 */
const DEFAULT_CONFIG: Required<Omit<LoggerConfig, 'pinoOptions' | 'baseContext'>> = {
  level: 'info',
  pretty: process.env.NODE_ENV !== 'production',
  structured: process.env.NODE_ENV === 'production',
  timestamp: true,
  includeSource: false,
};

/**
 * Create a structured logger instance.
 */
export function createLogger(config: LoggerConfig = {}): Logger {
  const resolvedConfig = { ...DEFAULT_CONFIG, ...config };

  // Determine if we should use pretty printing
  const shouldUsePretty = resolvedConfig.pretty && !resolvedConfig.structured;

  // Base pino options
  const pinoOptions: pino.LoggerOptions = {
    level: resolvedConfig.level,
    timestamp: resolvedConfig.timestamp,
    base: {
      pid: process.pid,
      hostname: process.env.HOSTNAME || 'unknown',
      service: 'agent-mux',
      ...config.baseContext,
    },
    ...config.pinoOptions,
  };

  // Add pretty printing for development
  const transport = shouldUsePretty ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname,service',
      messageFormat: '{msg}',
      customPrettifiers: {
        runId: (runId: string) => `run:${runId.slice(0, 8)}`,
        agent: (agent: string) => `agent:${agent}`,
        component: (component: string) => `[${component}]`,
      },
    },
  } : undefined;

  const baseLogger = transport ? pino(pinoOptions, pino.transport(transport)) : pino(pinoOptions);

  // Enhance logger with agent-mux specific methods
  const enhancedLogger = baseLogger as Logger;

  enhancedLogger.runStart = function(context) {
    this.info({
      runId: context.runId,
      agent: context.agent,
      model: context.model,
      prompt: context.prompt.slice(0, 100) + (context.prompt.length > 100 ? '...' : ''),
    }, 'Agent run started');
  };

  enhancedLogger.runComplete = function(context) {
    this.info({
      runId: context.runId,
      agent: context.agent,
      duration: context.duration,
      cost: context.cost,
    }, 'Agent run completed');
  };

  enhancedLogger.runError = function(context) {
    const error = context.error instanceof Error ? {
      message: context.error.message,
      stack: context.error.stack,
      name: context.error.name,
    } : context.error;

    this.error({
      runId: context.runId,
      agent: context.agent,
      error,
    }, 'Agent run failed');
  };

  enhancedLogger.toolCallStart = function(context) {
    this.debug({
      runId: context.runId,
      toolName: context.toolName,
      toolCallId: context.toolCallId,
      args: context.args,
    }, 'Tool call started');
  };

  enhancedLogger.toolCallComplete = function(context) {
    this.debug({
      runId: context.runId,
      toolName: context.toolName,
      toolCallId: context.toolCallId,
      duration: context.duration,
      result: typeof context.result === 'string' ? context.result.slice(0, 200) : context.result,
    }, 'Tool call completed');
  };

  enhancedLogger.perf = function(message, context) {
    this.info({
      ...context,
      type: 'performance',
    }, message);
  };

  enhancedLogger.auth = function(message, context) {
    this.info({
      ...context,
      type: 'auth',
    }, message);
  };

  enhancedLogger.config = function(message, context) {
    this.debug({
      ...context,
      type: 'config',
    }, message);
  };

  enhancedLogger.session = function(message, context) {
    this.info({
      ...context,
      type: 'session',
    }, message);
  };

  return enhancedLogger;
}

/**
 * Default logger instance.
 */
export const logger = createLogger({
  level: (process.env.AMUX_LOG_LEVEL as LogLevel) || 'info',
  pretty: process.env.AMUX_LOG_PRETTY === 'true',
  baseContext: {
    version: process.env.npm_package_version || 'unknown',
  },
});

/**
 * Create a logger for a specific component.
 */
export function createComponentLogger(component: string, context?: LogContext): Logger {
  return logger.child({ component, ...context });
}

/**
 * Create a logger for a specific run.
 */
export function createRunLogger(runId: string, agent: string, additionalContext?: LogContext): Logger {
  return logger.child({ runId, agent, ...additionalContext });
}