import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, writeFile, rm, mkdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { initDeck, pluginRoot } from '../scripts/ras.mjs';

const cli = path.join(pluginRoot, 'scripts/ras.mjs');
const upgrade = (...args) => spawnSync(process.execPath, [cli, 'upgrade', ...args], { encoding: 'utf8', timeout: 30_000 });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function snapshot(root, relative = '') {
  const result = {};
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) Object.assign(result, await snapshot(root, child));
    else result[child] = digest(await readFile(path.join(root, child)));
  }
  return result;
}

// Make a current deck look like an older, partly hand-edited one.
async function staleDeck(t) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ras-upgrade-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const deck = await initDeck(path.join(temporary, 'talk'));
  const reference = await initDeck(path.join(temporary, 'reference'));
  const pkg = JSON.parse(await readFile(path.join(deck, 'package.json'), 'utf8'));
  pkg.version = '0.5.0';
  await writeFile(path.join(deck, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  await writeFile(path.join(deck, 'scripts/probe.mjs'), '// hand-edited probe\n');
  await rm(path.join(deck, 'memory-guide.md'));
  await writeFile(path.join(deck, 'ras.config.json'), JSON.stringify({ minTextSize: 30, minCodeSize: 20 }, null, 2) + '\n');
  await writeFile(path.join(deck, '.gitignore'), 'node_modules/\ndist/\nnotes-private/\n');
  await writeFile(path.join(deck, 'slides.md'), '---\nmarp: true\ntheme: ras\n---\n# My own talk\n');
  await writeFile(path.join(deck, 'theme.css'), '/* @theme ras */\nsection { color: teal; }\n');
  await writeFile(path.join(deck, 'assets/photo.bin'), Buffer.from([0, 1, 2, 3, 255]));
  await writeFile(path.join(deck, 'outline.md'), '# Outline\n');
  return { deck, reference, currentVersion: JSON.parse(await readFile(path.join(pluginRoot, 'package.json'), 'utf8')).version };
}

test('upgrade without --yes, or with --dry-run, writes nothing', async t => {
  const { deck, currentVersion } = await staleDeck(t);
  const before = await snapshot(deck);
  for (const args of [[deck], [deck, '--dry-run']]) {
    const result = upgrade(...args);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, new RegExp(`0\\.5\\.0 -> ${currentVersion.replaceAll('.', '\\.')}`));
    assert.match(result.stdout, /add\s+memory-guide\.md/);
    assert.match(result.stdout, /update\s+scripts\/probe\.mjs/);
    assert.match(result.stdout, /merge\s+ras\.config\.json/);
    assert.match(result.stdout, /unchanged\s+justfile/);
    assert.match(result.stdout, /--yes/);
    assert.deepEqual(await snapshot(deck), before, `${args.join(' ')} must not change the deck`);
  }
  assert.equal(upgrade(deck, '--dry-run', '--yes').status, 1, 'Contradictory flags are rejected');
});

test('upgrade replaces kit files, keeps content byte for byte, and backs up replaced files', async t => {
  const { deck, reference, currentVersion } = await staleDeck(t);
  const contentFiles = ['slides.md', 'theme.css', 'assets/photo.bin', 'outline.md', 'brief.md', 'sources.md'];
  const before = await snapshot(deck);
  const result = upgrade(deck, '--yes');
  assert.equal(result.status, 0, result.stderr);
  const after = await snapshot(deck);
  for (const file of contentFiles) assert.equal(after[file], before[file], `${file} must stay untouched`);
  const fresh = await snapshot(reference);
  for (const file of Object.keys(fresh)) {
    if (['ras.config.json', '.gitignore', ...contentFiles].includes(file)) continue;
    assert.equal(after[file], fresh[file], `${file} must match RAS ${currentVersion}`);
  }
  assert.equal(JSON.parse(await readFile(path.join(deck, 'package.json'), 'utf8')).version, currentVersion);

  const backups = await readdir(path.join(deck, '.ras'));
  assert.equal(backups.length, 1);
  assert.match(backups[0], /^upgrade-backup-/);
  const backup = path.join(deck, '.ras', backups[0]);
  assert.ok(result.stdout.includes(backup), 'The backup path is printed');
  assert.match(result.stdout, /update\s+scripts\/probe\.mjs.*backed up/);
  assert.equal(await readFile(path.join(backup, 'scripts/probe.mjs'), 'utf8'), '// hand-edited probe\n');
  assert.equal(JSON.parse(await readFile(path.join(backup, 'package.json'), 'utf8')).version, '0.5.0');
  await assert.rejects(access(path.join(backup, 'memory-guide.md')), { code: 'ENOENT' }, 'Added files have nothing to back up');
  await assert.rejects(access(path.join(backup, 'justfile')), { code: 'ENOENT' }, 'Unchanged files are not backed up');
  assert.match(result.stdout, /npm ci/);
  assert.match(result.stdout, /npm run export/);

  const again = upgrade(deck, '--yes');
  assert.equal(again.status, 0, again.stderr);
  assert.doesNotMatch(again.stdout, /npm ci/, 'An up-to-date deck does not need a reinstall');
  assert.equal((await readdir(path.join(deck, '.ras'))).length, 1, 'An up-to-date deck needs no backup');
});

test('upgrade keeps existing configuration values and ignore rules while adding new ones', async t => {
  const { deck } = await staleDeck(t);
  assert.equal(upgrade(deck, '--yes').status, 0);
  const config = JSON.parse(await readFile(path.join(deck, 'ras.config.json'), 'utf8'));
  const template = JSON.parse(await readFile(path.join(pluginRoot, 'templates/ras.config.json'), 'utf8'));
  assert.equal(config.minTextSize, 30);
  assert.equal(config.minCodeSize, 20);
  assert.equal(config.minCreditSize, template.minCreditSize);
  assert.deepEqual(Object.keys(config).sort(), Object.keys(template).sort());
  const ignore = (await readFile(path.join(deck, '.gitignore'), 'utf8')).split('\n');
  for (const line of ['notes-private/', 'node_modules/', '.ras/']) assert.ok(ignore.includes(line), line);
});

test('upgrade refuses directories that are not RAS decks, including the RAS repository', async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ras-upgrade-reject-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const other = path.join(temporary, 'other');
  await mkdir(other);
  await writeFile(path.join(other, 'slides.md'), '# Not RAS\n');
  let result = upgrade(other, '--yes');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Not a RAS deck/);
  await writeFile(path.join(other, 'package.json'), JSON.stringify({ name: 'something-else' }));
  result = upgrade(other, '--yes');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /@ras\/slide-kit/);
  assert.deepEqual(await readdir(other), ['package.json', 'slides.md']);
  result = upgrade(path.join(temporary, 'missing'));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not found/);
  result = upgrade(pluginRoot, '--dry-run');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /RAS repository/);
});

test('every template file is classified as either deck content or upgradeable kit', async () => {
  const { contentTemplates, kitFiles } = await import('../scripts/ras.mjs');
  const kit = await kitFiles();
  const templates = Object.keys(await snapshot(path.join(pluginRoot, 'templates')));
  for (const file of templates) {
    assert.ok(contentTemplates.includes(file) !== kit.has(file), `${file} must be exactly one of content or kit`);
  }
  for (const file of ['slides.md', 'theme.css', 'brief.md', 'sources.md']) assert.ok(!kit.has(file));
  for (const file of kit.keys()) assert.ok(!file.startsWith('assets/') && !file.startsWith('.ras/') && !file.startsWith('dist/'), file);
});
