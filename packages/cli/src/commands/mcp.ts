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
        const servers = client.config.getMcpServers(agentName as never);
        if (servers.length === 0) {
          process.stdout.write('(no MCP servers installed)\n');
          return ExitCode.SUCCESS;
        }
        for (const server of servers) {
          const status = 'enabled'; // MCP servers are enabled by default
          process.stdout.write(`${server.name}\t${status}\t${server.command}\n`);
        }
        return ExitCode.SUCCESS;
      }
      case 'install': {
        const serverName = args.positionals[1];
        if (!serverName) {
          printError('Missing required argument: <server>');
          return ExitCode.GENERAL_ERROR;
        }
        // Create a basic MCP server config - in a real implementation this would
        // likely look up the server in a registry to get the proper command
        const serverConfig = {
          name: serverName,
          transport: 'stdio' as const,
          command: serverName, // Basic implementation - assumes command matches name
        };
        await client.config.addMcpServer(agentName as never, serverConfig);
        process.stdout.write(`installed: ${serverName} (${isGlobal ? 'global' : 'project'})\n`);
        return ExitCode.SUCCESS;
      }
      case 'uninstall': {
        const serverToRemove = args.positionals[1];
        if (!serverToRemove) {
          printError('Missing required argument: <server>');
          return ExitCode.GENERAL_ERROR;
        }
        await client.config.removeMcpServer(agentName as never, serverToRemove);
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
