/**
 * `amux models` subcommands.
 *
 * @see docs/10-cli-reference.md Section 10
 */

import type { AgentMuxClient } from '@a5c-ai/agent-mux-core';
import { AgentMuxError } from '@a5c-ai/agent-mux-core';
import type { ParsedArgs } from '../parse-args.js';
import { flagBool, flagStr } from '../parse-args.js';
import { ExitCode, errorCodeToExitCode } from '../exit-codes.js';
import {
  printTable, printJsonOk, printJsonError, printError, printJson, toPlain,
} from '../output.js';

export async function modelsCommand(client: AgentMuxClient, args: ParsedArgs): Promise<number> {
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
    return modelsList(client, agent, jsonMode);
  }

  if (sub === 'info' || sub === 'get') {
    const agent = args.positionals[0] ?? flagStr(args.flags, 'agent');
    const modelId = args.positionals[1];
    if (!agent || !modelId) {
      if (jsonMode) {
        printJsonError('VALIDATION_ERROR', 'Usage: amux models info <agent> <model>');
      } else {
        printError('Usage: amux models info <agent> <model>');
      }
      return ExitCode.USAGE_ERROR;
    }
    return modelsInfo(client, agent, modelId, jsonMode);
  }

  if (sub === 'refresh') {
    const agent = args.positionals[0] ?? flagStr(args.flags, 'agent');
    if (!agent) {
      if (jsonMode) {
        printJsonError('VALIDATION_ERROR', 'Missing required argument: <agent>');
      } else {
        printError('Missing required argument: <agent>');
      }
      return ExitCode.USAGE_ERROR;
    }
    return modelsRefresh(client, agent, jsonMode);
  }

  if (!sub) {
    if (jsonMode) {
      printJsonError('VALIDATION_ERROR', 'Missing subcommand. Available: list, info, refresh');
    } else {
      printError('Missing subcommand. Available: list, info, refresh');
    }
    return ExitCode.USAGE_ERROR;
  }

  if (jsonMode) {
    printJsonError('VALIDATION_ERROR', `Unknown subcommand: models ${sub}`);
  } else {
    printError(`Unknown subcommand: models ${sub}`);
  }
  return ExitCode.USAGE_ERROR;
}

async function modelsList(client: AgentMuxClient, agent: string, jsonMode: boolean): Promise<number> {
  try {
    const models = client.models.models(agent);

    if (jsonMode) {
      printJsonOk(models);
      return ExitCode.SUCCESS;
    }

    const rows = models.map((model) => {
      const m = toPlain(model);
      return [
      String(m['id'] ?? m['modelId'] ?? '--'),
      String(m['displayName'] ?? m['name'] ?? '--'),
      String(m['contextWindow'] ?? '--'),
      String(m['maxOutputTokens'] ?? '--'),
      m['supportsThinking'] ? 'yes' : 'no',
      m['supportsStreaming'] ? 'yes' : 'no',
      ];
    });

    printTable(
      ['Model ID', 'Display Name', 'Context', 'Max Output', 'Thinking', 'Streaming'],
      rows,
    );
    return ExitCode.SUCCESS;
  } catch (err: unknown) {
    return handleError(err, jsonMode);
  }
}

async function modelsInfo(
  client: AgentMuxClient, agent: string, modelId: string, jsonMode: boolean,
): Promise<number> {
  try {
    const model = client.models.model(agent, modelId);

    if (!model) {
      if (jsonMode) {
        printJsonError('AGENT_NOT_FOUND', `Model "${modelId}" not found for agent "${agent}"`);
      } else {
        printError(`Model "${modelId}" not found for agent "${agent}"`);
      }
      return ExitCode.GENERAL_ERROR;
    }

    if (jsonMode) {
      printJsonOk(model);
    } else {
      printJson(model);
    }
    return ExitCode.SUCCESS;
  } catch (err: unknown) {
    return handleError(err, jsonMode);
  }
}

async function modelsRefresh(client: AgentMuxClient, agent: string, jsonMode: boolean): Promise<number> {
  try {
    await client.models.refresh(agent);

    if (jsonMode) {
      printJsonOk({ refreshed: agent });
    } else {
      process.stdout.write(`Model list refreshed for ${agent}.\n`);
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
