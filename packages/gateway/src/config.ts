export interface GatewayConfig {
  host: string;
  port: number;
  webuiRoot?: string | null;
  enableWebui: boolean;
}

export const DEFAULT_GATEWAY_CONFIG: Readonly<GatewayConfig> = Object.freeze({
  host: '127.0.0.1',
  port: 7878,
  webuiRoot: null,
  enableWebui: true,
});

export function resolveGatewayConfig(config: Partial<GatewayConfig> = {}): GatewayConfig {
  return {
    ...DEFAULT_GATEWAY_CONFIG,
    ...config,
  };
}
