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
    printError(`Missing required argument: <agent>`);
    return ExitCode.GENERAL_ERROR;
  }

  // For now, delegate to existing plugin management logic
  // This will be enhanced in future iterations with proper MCP config handling
  switch (subcommand) {
    case 'list':
      // TODO: Implement proper MCP server listing
      process.stdout.write('(no results)\n');
      return ExitCode.SUCCESS;

    case 'install':
      const serverName = args.positionals[1];
      if (!serverName) {
        printError('Missing required argument: <server>');
        return ExitCode.GENERAL_ERROR;
      }
      // TODO: Implement proper MCP server installation
      process.stdout.write(`Would install MCP server '${serverName}' for agent '${agentName}'\n`);
      return ExitCode.SUCCESS;

    case 'uninstall':
      const serverToRemove = args.positionals[1];
      if (!serverToRemove) {
        printError('Missing required argument: <server>');
        return ExitCode.GENERAL_ERROR;
      }
      // TODO: Implement proper MCP server removal
      process.stdout.write(`Would uninstall MCP server '${serverToRemove}' for agent '${agentName}'\n`);
      return ExitCode.SUCCESS;

    default:
      printError(`Unknown subcommand: ${subcommand}`);
      return ExitCode.GENERAL_ERROR;
  }
}