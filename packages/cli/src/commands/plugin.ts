import { exec } from 'child_process';
import { promisify } from 'util';
import type { AgentMuxClient } from '@a5c-ai/agent-mux-core';
import type { ParsedArgs } from '../parse-args.js';
import { ExitCode } from '../exit-codes.js';
import { printError } from '../output.js';
import { detectAgentCapabilities } from '../lib/agent-capabilities.js';

const execAsync = promisify(exec);

export async function pluginCommand(
  client: AgentMuxClient,
  args: ParsedArgs,
): Promise<number> {
  if (args.flags.help) {
    process.stdout.write([
      'Usage: amux plugin <subcommand> <agent> [args] [flags]',
      '',
      'Manage plugins through agent-native plugin systems',
      '',
      'Subcommands:',
      '  list <agent>                    List installed plugins',
      '  install <agent> <plugin>        Install plugin',
      '  enable <agent> <plugin>         Enable plugin',
      '  disable <agent> <plugin>        Disable plugin',
      '  marketplace <agent> [cmd]       Access plugin marketplace',
      '',
      'Examples:',
      '  amux plugin list claude',
      '  amux plugin install claude filesystem-watcher',
      '  amux plugin marketplace claude',
      '',
      'Note: Plugin support varies by agent. Use "amux mcp" for MCP servers.',
    ].join('\n') + '\n');
    return ExitCode.SUCCESS;
  }

  const subcommand = args.subcommand;
  const agentName = args.positionals[0];

  if (!subcommand) {
    printError('Missing subcommand. Available: list, install, enable, disable, marketplace');
    return ExitCode.GENERAL_ERROR;
  }

  if (!agentName) {
    printError('Missing required argument: <agent>');
    return ExitCode.GENERAL_ERROR;
  }

  const capabilities = await detectAgentCapabilities(agentName);

  if (!capabilities.supportsPlugins) {
    printError(`Plugin management not supported for ${agentName}. Use 'amux mcp' for MCP servers.`);
    return ExitCode.GENERAL_ERROR;
  }

  if (!capabilities.pluginCommands.includes(subcommand)) {
    printError(`Subcommand '${subcommand}' not supported for ${agentName}. Available: ${capabilities.pluginCommands.join(', ')}`);
    return ExitCode.GENERAL_ERROR;
  }

  // Build native command
  const nativeArgs = [subcommand, ...args.positionals.slice(1)].join(' ');
  const nativeCommand = `${capabilities.nativePluginCommand} ${nativeArgs}`;

  try {
    const result = await execAsync(nativeCommand, {
      stdio: 'inherit',
      timeout: 30000
    });

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    return ExitCode.SUCCESS;
  } catch (error: any) {
    if (error.stdout) process.stdout.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);

    printError(`Plugin command failed: ${error.message}`);
    return error.code || ExitCode.GENERAL_ERROR;
  }
}