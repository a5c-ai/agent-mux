// @ts-nocheck -- TODO(observability): restore telemetry helpers
/**
 * @a5c-ai/agent-mux-observability
 *
 * Simple logging and telemetry infrastructure for agent-mux.
 * Provides structured logging and basic metrics without complex dependencies.
 */

import { initializeTelemetry, shutdownTelemetry } from './telemetry-simple.js';

// Logger exports
export {
  createSimpleLogger as createLogger,
  createComponentLogger,
  logger,
  type Logger,
  type LogLevel,
  type LogContext,
} from './logger-simple.js';

// Telemetry exports
export {
  telemetry,
  initializeTelemetry,
  shutdownTelemetry,
  type SimpleTelemetry,
} from './telemetry-simple.js';

// Convenience function to initialize both logging and telemetry
export function initializeObservability(): void {
  // Initialize telemetry
  initializeTelemetry();

  // Logger is initialized automatically when imported
}

// Shutdown function for graceful cleanup
export async function shutdownObservability(): Promise<void> {
  await shutdownTelemetry();
}