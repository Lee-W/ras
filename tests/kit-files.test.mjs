import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { deckPackageScripts, deckScripts, initDeck, kitFiles } from '../scripts/scaffold.mjs';
import { pluginRoot } from '../scripts/plugin-root.mjs';

const scriptsDir = path.join(pluginRoot, 'scripts');
const nonModuleKitFiles = new Set(['kit.css']);

// Relative imports (static, re-exports, and dynamic) of one script.
async function relativeImports(name) {
  const source = await readFile(path.join(scriptsDir, name), 'utf8');
  return [...source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)].map(match => {
    assert.ok(match[1].startsWith('./') && match[1].endsWith('.mjs'), `${name} imports ${match[1]}; keep kit imports as ./file.mjs`);
    return match[1].slice(2);
  });
}

async function importClosure(entries) {
  const seen = new Set();
  const queue = [...entries];
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    queue.push(...await relativeImports(name));
  }
  return seen;
}

test('the kit file list is exactly the import graph of the scripts a deck runs', async () => {
  // Entry points: every script the deck's npm scripts launch.
  const pkg = JSON.parse(await readFile(path.join(pluginRoot, 'package.json'), 'utf8'));
  const entries = new Set(deckPackageScripts.flatMap(name => [...pkg.scripts[name].matchAll(/node scripts\/([a-z-]+\.mjs)/g)].map(match => match[1])));
  assert.ok(entries.has('deck.mjs'), 'deck.mjs must be an entry point');
  const closure = await importClosure(entries);
  const listed = new Set(deckScripts.filter(name => name.endsWith('.mjs')));
  for (const name of closure) assert.ok(listed.has(name), `${name} is imported by the deck scripts but missing from the kit list`);
  for (const name of listed) assert.ok(closure.has(name), `${name} is in the kit list but no deck script imports it`);
  const others = deckScripts.filter(name => !name.endsWith('.mjs'));
  assert.deepEqual(others.sort(), [...nonModuleKitFiles].sort(), 'non-module kit files must be on the whitelist');
  for (const name of deckScripts) await readFile(path.join(scriptsDir, name));
  // Repo-only scripts never leak into a deck.
  for (const name of ['prompt.mjs', 'scaffold.mjs', 'ras.mjs', 'docs.mjs', 'validate.mjs', 'release-check.mjs', 'source-policy.mjs']) assert.ok(!listed.has(name), name);
  assert.ok((await readdir(scriptsDir)).includes('kit.css'));
});

test('a generated deck carries exactly the kit scripts and none of the docs-only dependencies', async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ras-kit-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const deck = await initDeck(path.join(temporary, 'talk'));
  assert.deepEqual((await readdir(path.join(deck, 'scripts'))).sort(), [...deckScripts].sort());
  const pkg = JSON.parse(await readFile(path.join(deck, 'package.json'), 'utf8'));
  const lock = JSON.parse(await readFile(path.join(deck, 'package-lock.json'), 'utf8'));
  for (const manifest of [pkg, lock.packages['']]) {
    assert.equal(manifest.devDependencies, undefined);
    for (const name of ['markdown-it', 'mermaid']) assert.ok(!(name in (manifest.dependencies ?? {})), name);
  }
  assert.ok((await kitFiles()).has('scripts/kit.css'));
});
