import type { AgentMuxClient } from '@a5c-ai/agent-mux-core';
import type { ParsedArgs } from '../parse-args.js';
import { ExitCode } from '../exit-codes.js';
import { printError } from '../output.js';

export async function mcpCommand(
  client: AgentMuxClient,
  args: ParsedArgs,
): Promise<number> {
  if (args.flags.help) {
    process.stdout.write([
      'Usage: amux mcp <subcommand> <agent> [args] [flags]',
      '',
      'Manage Model Context Protocol (MCP) servers per agent',
      '',
      'Subcommands:',
      '  list <agent>                    List installed MCP servers',
      '  install <agent> <server>        Install MCP server',
      '  uninstall <agent> <server>      Uninstall MCP server',
      '',
      'Flags:',
      '  --project                       Use project-level configuration',
      '  --global                        Use global configuration (default)',
      '',
      'Examples:',
      '  amux mcp list claude',
      '  amux mcp install claude filesystem',
      '  amux mcp install claude filesystem --project',
    ].join('\n') + '\n');
    return ExitCode.SUCCESS;
  }

  const subcommand = args.subcommand;
  const agentName = args.positionals[0];

  if (!subcommand) {
    printError('Missing subcommand. Available: list, install, uninstall');
    return ExitCode.GENERAL_ERROR;
  }

  if (!agentName) {
    printError('Missing required argument: <agent>');
    return ExitCode.GENERAL_ERROR;
  }

  const isGlobal = args.flags.global === true || !args.flags.project;

  try {
    switch (subcommand) {
      case 'list': {
        const installed = await client.plugins.list(agentName as never);
        if (installed.length === 0) {
          process.stdout.write('(no MCP servers installed)\n');
          return ExitCode.SUCCESS;
        }
        for (const p of installed) {
          process.stdout.write(`${p.pluginId}\t${p.enabled ? 'enabled' : 'disabled'}\n`);
        }
        return ExitCode.SUCCESS;
      }
      case 'install': {
        const serverName = args.positionals[1];
        if (!serverName) {
          printError('Missing required argument: <server>');
          return ExitCode.GENERAL_ERROR;
        }
        const installed = await client.plugins.install(agentName as never, serverName, { global: isGlobal });
        process.stdout.write(`installed: ${installed.pluginId} (${isGlobal ? 'global' : 'project'})\n`);
        return ExitCode.SUCCESS;
      }
      case 'uninstall': {
        const serverToRemove = args.positionals[1];
        if (!serverToRemove) {
          printError('Missing required argument: <server>');
          return ExitCode.GENERAL_ERROR;
        }
        await client.plugins.uninstall(agentName as never, serverToRemove);
        process.stdout.write(`uninstalled: ${serverToRemove}\n`);
        return ExitCode.SUCCESS;
      }
      default:
        printError(`Unknown subcommand: ${subcommand}`);
        return ExitCode.GENERAL_ERROR;
    }
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    printError(`mcp ${subcommand} failed: ${msg}`);
    return ExitCode.GENERAL_ERROR;
  }
}
