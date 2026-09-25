import assert from 'node:assert/strict';
import { readFile, realpath } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { readState, writeState } from './state.mjs';

function validateEntry(entry) {
  assert.match(entry?.id ?? '', /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Memory id must be lowercase words separated by hyphens');
  assert.ok(['user', 'feedback', 'project', 'reference'].includes(entry.type), 'Invalid memory type');
  for (const key of ['text', 'source']) assert.ok(typeof entry[key] === 'string' && entry[key].trim(), `Memory needs ${key}`);
}

export async function listMemories(root) {
  const store = await readState(root, 'memory.json');
  if (!store) return [];
  assert.ok(store.schemaVersion === 1 && Array.isArray(store.entries), 'Invalid memory store');
  store.entries.forEach(validateEntry);
  assert.equal(new Set(store.entries.map(entry => entry.id)).size, store.entries.length, 'Duplicate memory ids');
  return store.entries;
}

export async function saveMemory(root, candidate, { replace = false } = {}) {
  validateEntry(candidate);
  const entries = await listMemories(root);
  const index = entries.findIndex(entry => entry.id === candidate.id);
  assert.ok(index < 0 || replace, `Memory ${candidate.id} already exists; use --replace for an authorized update`);
  const { id, type, text, source } = candidate;
  const entry = { id, type, text, source, updatedAt: new Date().toISOString() };
  if (index < 0) entries.push(entry); else entries[index] = entry;
  await writeState(root, 'memory.json', { schemaVersion: 1, entries });
  return entry;
}

export async function removeMemory(root, id) {
  const entries = await listMemories(root);
  assert.ok(entries.some(entry => entry.id === id), `Unknown memory: ${id}`);
  await writeState(root, 'memory.json', { schemaVersion: 1, entries: entries.filter(entry => entry.id !== id) });
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  try {
    const [command, file, flag, ...extra] = process.argv.slice(2);
    if (command === 'list' && !file) console.log(JSON.stringify(await listMemories(process.cwd()), null, 2));
    else if (command === 'save' && file && !extra.length && (!flag || flag === '--replace')) console.log(JSON.stringify(await saveMemory(process.cwd(), JSON.parse(await readFile(file, 'utf8')), { replace: flag === '--replace' }), null, 2));
    else if (command === 'remove' && file && !flag) { await removeMemory(process.cwd(), file); console.log(`Removed ${file}`); }
    else throw new Error('Usage: node scripts/memory.mjs list | save <entry.json> [--replace] | remove <id>');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
