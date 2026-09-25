import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, mkdir, symlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { initDeck, makePrompt, pluginRoot } from '../scripts/ras.mjs';
import { projectHash, render, prepareFonts, readConfig, browserPath, run, defaults } from '../scripts/project.mjs';

test('portable prompts expand the selected workflow without requiring a vendor', async () => {
  const roleFiles = ['chu2', 'layer', 'pareo', 'lock', 'masking'].map(role => `agents/${role}.md`);
  const roles = await Promise.all(roleFiles.map(file => readFile(path.join(pluginRoot, file), 'utf8')));
  for (const operation of ['create', 'revise', 'review', 'export']) {
    const prompt = await makePrompt(operation, 'Explain retries --plan');
    assert.ok(prompt.includes(`# RAS — ${operation}`));
    assert.match(prompt, /# Marp authoring contract/);
    assert.match(prompt, /# Review and verification/);
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
  for (const name of ['deck', 'project', 'probe', 'fonts', 'review', 'state', 'memory']) {
    const script = await readFile(path.join(target, `scripts/${name}.mjs`), 'utf8');
    assert.doesNotMatch(script, /\/Users\/|\.config\/|\.\.\/\.\.\/ras/);
  }
  await writeFile(path.join(target, 'slides.md'), '# Preserve me');
  await assert.rejects(initDeck(target), /already exists/);
  assert.equal(await readFile(path.join(target, 'slides.md'), 'utf8'), '# Preserve me');
});

test('verification hash changes with assets, configuration, scripts, and source', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ras-hash-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'assets'));
  await mkdir(path.join(root, 'scripts'));
  let previous = await projectHash(root);
  for (const file of ['slides.md', 'theme.css', 'ras.config.json', 'package.json', 'package-lock.json', 'assets/image.svg', 'scripts/deck.mjs']) {
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
