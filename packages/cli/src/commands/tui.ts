import type { AgentMuxClient } from '@a5c-ai/agent-mux-core';
import type { ParsedArgs } from '../parse-args.js';
import { ExitCode } from '../exit-codes.js';
import { printError } from '../output.js';

export async function tuiCommand(
  client: AgentMuxClient,
  args: ParsedArgs,
): Promise<number> {
  if (args.flags.help) {
    process.stdout.write(
      [
        'Usage: amux tui [--agent <name>]',
        '',
        'Launches the Ink-based agent-mux TUI with the default plugin set.',
        '',
        'Options:',
        '  --agent <name>  Default agent for new prompts (default: claude-code)',
      ].join('\n') + '\n',
    );
    return ExitCode.SUCCESS;
  }

  let tui: { App: unknown; builtinPlugins: unknown };
  try {
    // @ts-expect-error optional peer package — resolved at runtime if installed
    tui = await import('@a5c-ai/agent-mux-tui');
  } catch (err) {
    printError(
      'The TUI package is not installed. Install it with:\n' +
        '  npm i -g @a5c-ai/agent-mux-tui\n' +
        `Underlying error: ${(err as Error).message}`,
    );
    return ExitCode.GENERAL_ERROR;
  }

  const React = await import('react');
  const defaultAgent = (args.flags.agent as string | undefined) ?? 'claude-code';
  const { render } = await import('ink');
  render(
    React.createElement(tui.App as never, {
      client: client as never,
      plugins: tui.builtinPlugins as never,
      defaultAgent,
    }),
  );
  return ExitCode.SUCCESS;
}
