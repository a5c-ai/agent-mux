/**
 * `amux plugins` subcommands.
 *
 * @see docs/10-cli-reference.md Section 11
 */

import type { AgentMuxClient } from '@a5c-ai/agent-mux-core';
import { AgentMuxError } from '@a5c-ai/agent-mux-core';
import type { ParsedArgs } from '../parse-args.js';
import { flagBool, flagStr } from '../parse-args.js';
import { ExitCode, errorCodeToExitCode } from '../exit-codes.js';
import {
  printTable, printJsonOk, printJsonError, printError,
} from '../output.js';

export async function pluginsCommand(client: AgentMuxClient, args: ParsedArgs): Promise<number> {
  const sub = args.subcommand;
  const jsonMode = flagBool(args.flags, 'json') === true;

  if (sub === 'list') {
    const agent = args.positionals[0] ?? flagStr(args.flags, 'agent');
    if (!agent) {
      if (jsonMode) {
        printJsonError('VALIDATION_ERROR', 'Missing required argument: <agent>');
      } else {
        printError('Missing required argument: <agent>');
      }
      return ExitCode.USAGE_ERROR;
    }
    return pluginsList(client, agent, jsonMode);
  }

  if (sub === 'install') {
    const agent = args.positionals[0];
    const plugin = args.positionals[1];
    if (!agent || !plugin) {
      if (jsonMode) {
        printJsonError('VALIDATION_ERROR', 'Usage: amux plugins install <agent> <plugin>');
      } else {
        printError('Usage: amux plugins install <agent> <plugin>');
      }
      return ExitCode.USAGE_ERROR;
    }
    return pluginsInstall(client, agent, plugin, args, jsonMode);
  }

  if (sub === 'uninstall') {
    const agent = args.positionals[0];
    const plugin = args.positionals[1];
    if (!agent || !plugin) {
      if (jsonMode) {
        printJsonError('VALIDATION_ERROR', 'Usage: amux plugins uninstall <agent> <plugin>');
      } else {
        printError('Usage: amux plugins uninstall <agent> <plugin>');
      }
      return ExitCode.USAGE_ERROR;
    }
    return pluginsUninstall(client, agent, plugin, jsonMode);
  }

  if (!sub) {
    if (jsonMode) {
      printJsonError('VALIDATION_ERROR', 'Missing subcommand. Available: list, install, uninstall');
    } else {
      printError('Missing subcommand. Available: list, install, uninstall');
    }
    return ExitCode.USAGE_ERROR;
  }

  if (jsonMode) {
    printJsonError('VALIDATION_ERROR', `Unknown subcommand: plugins ${sub}`);
  } else {
    printError(`Unknown subcommand: plugins ${sub}`);
  }
  return ExitCode.USAGE_ERROR;
}

async function pluginsList(client: AgentMuxClient, agent: string, jsonMode: boolean): Promise<number> {
  try {
    // PluginManager is currently a stub — gracefully handle
    // PluginManager is a stub interface at this phase; accessing optional
    // methods/properties by string key requires a loose view.
    const pm = client.plugins as unknown as Record<string, unknown>;
    if (pm['_stub']) {
      if (jsonMode) {
        printJsonOk([]);
      } else {
        process.stdout.write('Plugin management is not yet implemented.\n');
      }
      return ExitCode.SUCCESS;
    }

    const list = (await (pm['list'] as Function)?.(agent)) ?? [];
    if (jsonMode) {
      printJsonOk(list);
      return ExitCode.SUCCESS;
    }

    const rows = (list as Array<Record<string, unknown>>).map((p) => [
      String(p['id'] ?? '--'),
      String(p['name'] ?? '--'),
      String(p['version'] ?? '--'),
      String(p['format'] ?? '--'),
      p['enabled'] ? 'yes' : 'no',
    ]);

    printTable(['Plugin ID', 'Name', 'Version', 'Format', 'Enabled'], rows);
    return ExitCode.SUCCESS;
  } catch (err: unknown) {
    return handleError(err, jsonMode);
  }
}

async function pluginsInstall(
  client: AgentMuxClient, agent: string, plugin: string, args: ParsedArgs, jsonMode: boolean,
): Promise<number> {
  try {
    // PluginManager is a stub interface at this phase; accessing optional
    // methods/properties by string key requires a loose view.
    const pm = client.plugins as unknown as Record<string, unknown>;
    if (pm['_stub']) {
      if (jsonMode) {
        printJsonError('PLUGIN_ERROR', 'Plugin management is not yet implemented');
      } else {
        printError('Plugin management is not yet implemented.');
      }
      return ExitCode.PLUGIN_ERROR;
    }

    const version = flagStr(args.flags, 'version');
    const global = flagBool(args.flags, 'global');
    await (pm['install'] as Function)?.(agent, plugin, { version, global });

    if (jsonMode) {
      printJsonOk({ installed: plugin, agent });
    } else {
      process.stdout.write(`Plugin "${plugin}" installed for ${agent}.\n`);
    }
    return ExitCode.SUCCESS;
  } catch (err: unknown) {
    return handleError(err, jsonMode);
  }
}

async function pluginsUninstall(
  client: AgentMuxClient, agent: string, plugin: string, jsonMode: boolean,
): Promise<number> {
  try {
    // PluginManager is a stub interface at this phase; accessing optional
    // methods/properties by string key requires a loose view.
    const pm = client.plugins as unknown as Record<string, unknown>;
    if (pm['_stub']) {
      if (jsonMode) {
        printJsonError('PLUGIN_ERROR', 'Plugin management is not yet implemented');
      } else {
        printError('Plugin management is not yet implemented.');
      }
      return ExitCode.PLUGIN_ERROR;
    }

    await (pm['uninstall'] as Function)?.(agent, plugin);

    if (jsonMode) {
      printJsonOk({ uninstalled: plugin, agent });
    } else {
      process.stdout.write(`Plugin "${plugin}" uninstalled from ${agent}.\n`);
    }
    return ExitCode.SUCCESS;
  } catch (err: unknown) {
    return handleError(err, jsonMode);
  }
}

function handleError(err: unknown, jsonMode: boolean): number {
  if (err instanceof AgentMuxError) {
    if (jsonMode) {
      printJsonError(err.code, err.message, err.recoverable);
    } else {
      printError(err.message);
    }
    return errorCodeToExitCode(err.code);
  }

  const message = err instanceof Error ? err.message : String(err);
  if (jsonMode) {
    printJsonError('INTERNAL', message);
  } else {
    printError(message);
  }
  return ExitCode.GENERAL_ERROR;
}
