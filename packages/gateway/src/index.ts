import {
  DEFAULT_GATEWAY_CONFIG,
  GatewayConfig,
  resolveGatewayConfig,
} from './config.js';
import {
  createGatewayLogger,
  GatewayLogger,
} from './logging.js';

export type { GatewayConfig } from './config.js';
export {
  DEFAULT_GATEWAY_CONFIG,
  resolveGatewayConfig,
} from './config.js';
export type { GatewayLogger } from './logging.js';
export { createGatewayLogger } from './logging.js';

export interface Gateway {
  readonly config: GatewayConfig;
  readonly logger: GatewayLogger;
  readonly started: boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createGateway(config: Partial<GatewayConfig> = {}): Gateway {
  const resolvedConfig = resolveGatewayConfig(config);
  const logger = createGatewayLogger();
  let started = false;

  return {
    config: resolvedConfig,
    logger,
    get started() {
      return started;
    },
    async start() {
      if (started) {
        return;
      }
      started = true;
      logger.info('Gateway started', {
        host: resolvedConfig.host,
        port: resolvedConfig.port,
        enableWebui: resolvedConfig.enableWebui,
      });
    },
    async stop() {
      if (!started) {
        return;
      }
      started = false;
      logger.info('Gateway stopped', {
        host: resolvedConfig.host,
        port: resolvedConfig.port,
      });
    },
  };
}
