/**
 * Shared MCP-server plugin helpers.
 *
 * Adapters whose native config stores MCP servers under `mcpServers`
 * (claude, cursor, gemini, opencode, openclaw) delegate list/install/
 * uninstall to these helpers instead of reimplementing JSON read-modify-
 * write per adapter.
 */

import * as fsp from 'node:fs/promises';
import * as pathMod from 'node:path';

import type {
  InstalledPlugin,
  PluginInstallOptions,
} from '@a5c-ai/agent-mux-core';

async function readConfig(configPath: string): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await fsp.readFile(configPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function writeConfig(configPath: string, doc: Record<string, unknown>): Promise<void> {
  await fsp.mkdir(pathMod.dirname(configPath), { recursive: true });
  await fsp.writeFile(configPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
}

export async function mcpListPlugins(configPath: string): Promise<InstalledPlugin[]> {
  const doc = await readConfig(configPath);
  const servers = (doc['mcpServers'] && typeof doc['mcpServers'] === 'object'
    ? (doc['mcpServers'] as Record<string, unknown>)
    : {});
  return Object.keys(servers).map((id) => ({
    pluginId: id,
    name: id,
    version: '0.0.0',
    enabled: true,
  }));
}

export async function mcpInstallPlugin(
  configPath: string,
  pluginId: string,
  options?: PluginInstallOptions,
): Promise<InstalledPlugin> {
  if (!pluginId) throw new Error('pluginId is required');
  const doc = await readConfig(configPath);
  const servers = (doc['mcpServers'] && typeof doc['mcpServers'] === 'object'
    ? { ...(doc['mcpServers'] as Record<string, unknown>) }
    : {}) as Record<string, unknown>;
  servers[pluginId] = { command: pluginId };
  doc['mcpServers'] = servers;
  await writeConfig(configPath, doc);
  return {
    pluginId,
    name: pluginId,
    version: options?.version ?? '0.0.0',
    enabled: true,
  };
}

export async function mcpUninstallPlugin(configPath: string, pluginId: string): Promise<void> {
  const doc = await readConfig(configPath);
  const servers = (doc['mcpServers'] && typeof doc['mcpServers'] === 'object'
    ? { ...(doc['mcpServers'] as Record<string, unknown>) }
    : {}) as Record<string, unknown>;
  if (!(pluginId in servers)) return;
  delete servers[pluginId];
  doc['mcpServers'] = servers;
  await writeConfig(configPath, doc);
}
