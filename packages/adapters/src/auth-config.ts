import * as os from 'node:os';
import * as path from 'node:path';
import { promises as fsp } from 'node:fs';

/**
 * Resolve a set of candidate paths (supports `~/` prefix) against the user's
 * home directory and return the first one that exists.
 */
export async function findExistingAuthFile(candidates: string[]): Promise<string | null> {
  const home = os.homedir();
  for (const raw of candidates) {
    const abs = raw.startsWith('~')
      ? path.join(home, raw.slice(raw.startsWith('~/') ? 2 : 1))
      : raw;
    try {
      const st = await fsp.stat(abs);
      if (st.isFile()) return abs;
    } catch {
      // keep looking
    }
  }
  return null;
}

/**
 * Read an agent auth config file (if present) and attempt to extract a
 * recognizable token/email identity. Returns null if no candidate exists.
 */
export async function readAuthConfigIdentity(
  candidates: string[],
  tokenKeys: string[] = ['apiKey', 'api_key', 'OPENAI_API_KEY', 'token', 'accessToken', 'access_token'],
): Promise<{ filePath: string; identity: string } | null> {
  const filePath = await findExistingAuthFile(candidates);
  if (!filePath) return null;
  let identity = path.basename(filePath);
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const k of tokenKeys) {
      const v = parsed[k];
      if (typeof v === 'string' && v.length > 4) {
        identity = `...${v.slice(-4)}`;
        break;
      }
    }
    if (typeof parsed['email'] === 'string') identity = parsed['email'] as string;
  } catch {
    // opaque file; keep the basename identity
  }
  return { filePath, identity };
}
