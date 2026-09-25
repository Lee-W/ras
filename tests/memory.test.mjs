import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { listMemories, saveMemory, removeMemory } from '../scripts/memory.mjs';
import { initDeck, makePrompt } from '../scripts/ras.mjs';

const example = { id: 'short-opening', type: 'feedback', text: 'Keep this opening under one minute.', source: 'Explicit speaker feedback in the test fixture.' };

test('memory stays project-local, rejects accidental replacement, and preserves unrelated entries', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ras-memory-'));
  const other = await mkdtemp(path.join(os.tmpdir(), 'ras-other-memory-'));
  t.after(() => Promise.all([rm(root, { recursive: true, force: true }), rm(other, { recursive: true, force: true })]));
  assert.deepEqual(await listMemories(root), []);
  assert.deepEqual(await readdir(root), []);
  await saveMemory(root, example);
  await saveMemory(root, { ...example, id: 'clear-takeaway', text: 'State the main takeaway.' });
  await assert.rejects(saveMemory(root, { ...example, text: 'Overwrite without approval.' }), /already exists/);
  await saveMemory(root, { ...example, text: 'Keep it under thirty seconds.' }, { replace: true });
  assert.equal((await listMemories(root)).length, 2);
  assert.equal((await listMemories(root))[0].text, 'Keep it under thirty seconds.');
  assert.deepEqual(await listMemories(other), []);
  await removeMemory(root, example.id);
  assert.deepEqual((await listMemories(root)).map(entry => entry.id), ['clear-takeaway']);
  await assert.rejects(saveMemory(root, { ...example, id: '../../outside' }), /Memory id/);
  await writeFile(path.join(root, '.ras/memory.json'), '{');
  await assert.rejects(saveMemory(root, example), SyntaxError);
  assert.equal(await readFile(path.join(root, '.ras/memory.json'), 'utf8'), '{');
  for (const invalid of ['null', 'false', '0', '[]']) {
    await writeFile(path.join(root, '.ras/memory.json'), invalid);
    await assert.rejects(saveMemory(root, example), /Invalid project state/);
    assert.equal(await readFile(path.join(root, '.ras/memory.json'), 'utf8'), invalid);
  }
});

test('private state refuses symlinks and generated decks exclude memories from Git', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ras-memory-boundary-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await symlink(root, path.join(root, '.ras'));
  await assert.rejects(saveMemory(root, example), /real project directory/);
  await rm(path.join(root, '.ras'));
  const deck = await initDeck(path.join(root, 'talk'));
  await saveMemory(deck, example);
  execFileSync('git', ['init', '--quiet'], { cwd: deck });
  assert.equal(execFileSync('git', ['check-ignore', '.ras/memory.json'], { cwd: deck, encoding: 'utf8' }).trim(), '.ras/memory.json');
  const cli = JSON.parse(execFileSync(process.execPath, [path.join(deck, 'scripts/memory.mjs'), 'list'], { cwd: deck, encoding: 'utf8' }));
  assert.equal(cli[0].id, example.id);
});

test('remember and retro prompts carry their selected skill and persistence limits for every host', async () => {
  for (const operation of ['remember', 'retro']) {
    const skill = await readFile(new URL(`../skills/${operation}/SKILL.md`, import.meta.url), 'utf8');
    const contract = await readFile(new URL('../references/memory.md', import.meta.url), 'utf8');
    for (const chat of [false, true]) {
      const prompt = await makePrompt(operation, 'Use the selected project', { chat });
      assert.ok(prompt.includes(skill));
      assert.ok(prompt.includes(contract));
      assert.match(prompt, /Use the selected memory operation, not slide creation or export/);
      if (chat) assert.match(prompt, /do not claim persistence/);
      assert.doesNotMatch(prompt, /Without those tools, return a draft with separately labelled file contents/);
    }
  }
});
