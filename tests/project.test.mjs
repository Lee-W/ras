import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, rm, mkdir, symlink, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { initDeck, makePrompt, operations, pluginRoot } from '../scripts/ras.mjs';
import { sharedSources } from '../scripts/docs-pages.mjs';
import { projectHash, render, prepareFonts, readConfig, browserPath, run, defaults } from '../scripts/project.mjs';

test('all portable operations carry the shared interaction contract in tool and chat hosts', async () => {
  const voice = await readFile(path.join(pluginRoot, 'skills/orchestrator-voice/SKILL.md'), 'utf8');
  for (const operation of ['create', 'outline', 'revise', 'review', 'export', 'remember', 'retro']) {
    for (const chat of [false, true]) {
      const prompt = await makePrompt(operation, '投影片用英文，繼續用臺灣華語討論。', { chat });
      assert.ok(prompt.includes(voice), `${operation} (chat=${chat}) must expand the full interaction contract`);
      assert.equal(prompt.split('## Source: skills/orchestrator-voice/SKILL.md').length - 1, 1);
    }
  }
});

test('portable prompts expand the selected workflow without requiring a vendor', async () => {
  const roleFiles = ['chu2', 'layer', 'pareo', 'lock', 'masking'].map(role => `agents/${role}.md`);
  const roles = await Promise.all(roleFiles.map(file => readFile(path.join(pluginRoot, file), 'utf8')));
  const imageRights = await readFile(path.join(pluginRoot, 'references/image-rights.md'), 'utf8');
  for (const operation of ['create', 'outline', 'revise', 'review', 'export']) {
    const prompt = await makePrompt(operation, 'Explain retries --plan');
    assert.ok(prompt.includes(`# RAS — ${operation}`));
    assert.match(prompt, /# Marp authoring contract/);
    assert.match(prompt, /# Review and verification/);
    assert.ok(prompt.includes(imageRights), 'Every presentation operation must include the image-rights review');
    assert.match(prompt, /Without those tools, return a draft/);
    assert.match(prompt, /Explain retries --plan/);
    assert.doesNotMatch(prompt, /ANTHROPIC_API_KEY|OPENAI_API_KEY/);
    for (const role of roles) assert.ok(prompt.includes(role), 'Portable prompts must include the complete role instructions');
  }
  await assert.rejects(makePrompt('../secrets'), /Choose an operation/);
  const chat = await makePrompt('create', 'A short talk', { chat: true });
  assert.match(chat, /Active host: chat only/);
  assert.match(chat, /Do not simulate tool calls/);
  for (const role of roles) assert.ok(chat.includes(role), 'Chat mode must preserve role voices and handoffs');
  assert.ok(chat.includes(imageRights), 'Chat mode must retain image-rights checks and their evidence limits');
});

test('Marp keeps fenced separators, untitled pages, reveal order, and speaker notes', async () => {
  const theme = await readFile(path.join(pluginRoot, 'templates/theme.css'), 'utf8');
  const source = '---\nmarp: true\ntheme: ras\n---\n# First\n\n<!-- Speak first. -->\n\n---\n\n```text\n---\n## This is code\n```\n\n<!-- Silent diagram. -->\n\n---\n\n# First, then next\n';
  const result = render(source, theme);
  assert.equal(result.count, 3);
  assert.match(result.html[1], /This is code/);
  assert.doesNotMatch(result.html[1], /<h[12]/);
  assert.deepEqual(result.comments.map(comments => comments.join('').trim()), ['Speak first.', 'Silent diagram.', '']);
});

test('initialization copies a portable project and refuses to overwrite one', async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ras-init-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const target = await initDeck(path.join(temporary, 'talk'));
  const pkg = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'));
  const lock = JSON.parse(await readFile(path.join(target, 'package-lock.json'), 'utf8'));
  assert.deepEqual(pkg.dependencies, lock.packages[''].dependencies);
  assert.equal(pkg.scripts.export, 'node scripts/deck.mjs export');
  assert.equal(pkg.bin, undefined);
  assert.equal(pkg.license, 'UNLICENSED', 'Initialization must not license the speaker\'s own content');
  assert.equal(lock.packages[''].license, pkg.license);
  assert.equal(lock.packages[''].bin, undefined);
  for (const [source, destination] of [['LICENSE', 'licenses/ras/MIT.txt'], ['NOTICE.md', 'licenses/ras/NOTICE.md']]) {
    assert.deepEqual(await readFile(path.join(target, destination)), await readFile(path.join(pluginRoot, source)));
  }
  for (const oldName of ['RAS-LICENSE', 'RAS-NOTICE.md']) {
    await assert.rejects(access(path.join(target, oldName)), { code: 'ENOENT' });
  }
  for (const guide of ['README.md', 'review-guide.md', 'sources.md', 'image-rights-guide.md', 'image-rights-guide-zh-tw.md', 'licenses/README.md']) {
    const text = await readFile(path.join(target, guide), 'utf8');
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      if (!/^https?:/.test(match[1])) await readFile(path.resolve(target, path.dirname(guide), match[1]));
    }
  }
  for (const name of ['deck', 'project', 'probe', 'fonts', 'review', 'state', 'memory']) {
    const script = await readFile(path.join(target, `scripts/${name}.mjs`), 'utf8');
    assert.doesNotMatch(script, /\/Users\/|\.config\/|\.\.\/\.\.\/ras/);
  }
  await writeFile(path.join(target, 'slides.md'), '# Preserve me');
  await assert.rejects(initDeck(target), /already exists/);
  assert.equal(await readFile(path.join(target, 'slides.md'), 'utf8'), '# Preserve me');
});

test('CLI entry points execute through a symlinked installation directory', async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ras-cli-link-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const linked = path.join(temporary, 'linked-kit');
  await symlink(pluginRoot, linked, 'dir');
  const deck = path.join(temporary, 'talk');
  const invoke = (script, args, options = {}) => execFileSync(process.execPath, [path.join(linked, 'scripts', script), ...args], { encoding: 'utf8', timeout: 30_000, ...options });
  assert.match(invoke('ras.mjs', ['init', deck]), /Created/);
  await writeFile(path.join(deck, 'slides.md'), '---\nmarp: true\ntheme: ras\n---\n# A real CLI build\n');
  assert.match(invoke('deck.mjs', ['build'], { cwd: deck }), /Built 1 slides/);
  assert.match(await readFile(path.join(deck, 'dist/index.html'), 'utf8'), /A real CLI build/);
  const docs = spawnSync(process.execPath, [path.join(linked, 'scripts/docs.mjs')], {
    env: { ...process.env, PORT: 'invalid' }, encoding: 'utf8', timeout: 30_000,
  });
  assert.equal(docs.status, 1, 'The docs CLI must execute and reject an invalid port, not silently succeed');
  assert.match(docs.stderr, /port/i);
});

test('verification hash changes with assets, configuration, scripts, and source', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ras-hash-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'assets'));
  await mkdir(path.join(root, 'scripts'));
  await mkdir(path.join(root, 'licenses', 'ras'), { recursive: true });
  let previous = await projectHash(root);
  for (const file of ['slides.md', 'theme.css', 'ras.config.json', 'package.json', 'package-lock.json', 'RAS-LICENSE', 'RAS-NOTICE.md', 'licenses/README.md', 'licenses/ras/MIT.txt', 'licenses/ras/NOTICE.md', 'assets/image.svg', 'scripts/deck.mjs']) {
    await writeFile(path.join(root, file), `changed ${file}`);
    const current = await projectHash(root);
    assert.notEqual(current, previous, `${file} must invalidate prior evidence`);
    previous = current;
  }
  await mkdir(path.join(root, 'dist'));
  await writeFile(path.join(root, 'dist/index.html'), 'generated');
  assert.equal(await projectHash(root), previous);
});

test('font output retains the exact upstream license for each font family', async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ras-fonts-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  await prepareFonts(temporary);
  const require = createRequire(import.meta.url);
  for (const family of ['roboto', 'roboto-condensed', 'roboto-mono', 'noto-sans-tc']) {
    const scope = family === 'noto-sans-tc' ? '@fontsource-variable' : '@fontsource';
    const source = path.dirname(require.resolve(`${scope}/${family}/package.json`));
    const license = await readFile(path.join(source, 'LICENSE'));
    assert.ok(license.length > 0);
    assert.deepEqual(await readFile(path.join(temporary, 'assets/fonts', `${family}-LICENSE`)), license);
  }
});

test('configuration rejects unknown settings, invalid limits, and malformed JSON', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ras-config-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.deepEqual(await readConfig(root), defaults);
  for (const value of [0, -1, '24', null]) {
    await writeFile(path.join(root, 'ras.config.json'), JSON.stringify({ minTextSize: value }));
    await assert.rejects(readConfig(root), /positive number/);
  }
  await writeFile(path.join(root, 'ras.config.json'), '{"unknown": 24}');
  await assert.rejects(readConfig(root), /Unknown/);
  await writeFile(path.join(root, 'ras.config.json'), '{');
  await assert.rejects(readConfig(root), SyntaxError);
});

test('missing browsers and failed child commands report errors', async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ras-errors-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const previous = process.env.RAS_BROWSER_PATH;
  try {
    process.env.RAS_BROWSER_PATH = path.join(temporary, 'missing-browser');
    await assert.rejects(browserPath(), /Browser missing/);
  } finally {
    if (previous === undefined) delete process.env.RAS_BROWSER_PATH;
    else process.env.RAS_BROWSER_PATH = previous;
  }
  await assert.rejects(run(path.join(temporary, 'missing-command'), [], { stdio: 'ignore' }), { code: 'ENOENT' });
  await assert.rejects(run(process.execPath, ['-e', 'process.exit(7)'], { stdio: 'ignore' }), /failed \(7\)/);
});

test('source hashing rejects asset symlinks outside the project', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ras-link-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'assets'));
  await writeFile(path.join(root, 'outside.txt'), 'outside asset');
  await symlink(path.join(root, 'outside.txt'), path.join(root, 'assets/link.txt'));
  await assert.rejects(projectHash(root), /rather than symlinks/);
});

test('outline prompt expands its own skill in tool and chat hosts', async () => {
  const skill = await readFile(path.join(pluginRoot, 'skills/outline/SKILL.md'), 'utf8');
  for (const chat of [false, true]) {
    const prompt = await makePrompt('outline', '討論 15 分鐘的重試策略大綱', { chat });
    assert.ok(prompt.includes(skill));
    assert.ok(prompt.includes('## Source: skills/outline/SKILL.md'));
  }
});

test('every operation skill is registered in the CLI, docs, router and root skill', async () => {
  const internal = ['command-router', 'orchestrator-voice'];
  const entries = (await readdir(path.join(pluginRoot, 'skills'), { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name);
  assert.deepEqual(entries.filter(name => !internal.includes(name)).sort(), [...operations].sort());
  const router = await readFile(path.join(pluginRoot, 'skills/command-router/SKILL.md'), 'utf8');
  const root = await readFile(path.join(pluginRoot, 'SKILL.md'), 'utf8');
  for (const operation of operations) {
    assert.ok(sharedSources.has(`skills/${operation}/SKILL.md`), `${operation} must be a docs shared source`);
    assert.ok(router.includes(`[${operation}](../${operation}/SKILL.md)`), `${operation} must be routed`);
    assert.ok(root.includes(`ras:${operation}`), `${operation} must be mentioned in the root SKILL.md`);
  }
});
