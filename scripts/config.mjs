import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const defaults = { minTextSize: 24, minCodeSize: 18, minCreditSize: 14, allowExportOnCheckFailure: false, profile: null };
const booleanSettings = new Set(['allowExportOnCheckFailure']);
// The speaker's profile file, read by the AI host; relative paths resolve from the deck.
const pathSettings = new Set(['profile']);

export async function readConfig(root) {
  const file = path.join(root, 'ras.config.json');
  const config = existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : {};
  for (const key of Object.keys(config)) {
    if (!(key in defaults)) throw new Error(`Unknown ras.config.json setting: ${key}`);
    if (booleanSettings.has(key)) { if (typeof config[key] !== 'boolean') throw new Error(`${key} must be true or false`); continue; }
    if (pathSettings.has(key)) { if (config[key] !== null && (typeof config[key] !== 'string' || !config[key].trim())) throw new Error(`${key} must be a file path or null`); continue; }
    if (!Number.isFinite(config[key]) || config[key] <= 0) throw new Error(`${key} must be a positive number`);
  }
  return { ...defaults, ...config };
}
