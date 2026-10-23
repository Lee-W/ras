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
  assert.equal(pkg.scripts.blog, 'node scripts/blog.mjs');
  assert.equal(pkg.bin, undefined);
  assert.equal(pkg.license, 'UNLICENSED', 'Initialization must not license the speaker\'s own content');
  assert.equal(lock.packages[''].license, pkg.license);
  assert.equal(lock.packages[''].bin, undefined);
  const justfile = await readFile(path.join(target, 'justfile'), 'utf8');
  assert.deepEqual(justfile, await readFile(path.join(pluginRoot, 'templates/justfile'), 'utf8'));
  assert.doesNotMatch(justfile, /\/Users\/|archive\.py|\.venv|source\//, 'Deck recipes must run directly inside the standalone project');
  const readme = await readFile(path.join(target, 'README.md'), 'utf8');
  assert.match(readme, /just build/);
  assert.match(readme, /preview.*preserves.*PDF/);
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
  for (const name of ['deck', 'project', 'probe', 'fonts', 'review', 'state', 'memory', 'blog']) {
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
  for (const file of ['slides.md', 'theme.css', 'ras.config.json', 'package.json', 'package-lock.json', 'justfile', 'RAS-LICENSE', 'RAS-NOTICE.md', 'licenses/README.md', 'licenses/ras/MIT.txt', 'licenses/ras/NOTICE.md', 'assets/image.svg', 'scripts/deck.mjs']) {
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
  for (const value of [1, 'true', null]) {
    await writeFile(path.join(root, 'ras.config.json'), JSON.stringify({ allowExportOnCheckFailure: value }));
    await assert.rejects(readConfig(root), /must be true or false/);
  }
  await writeFile(path.join(root, 'ras.config.json'), JSON.stringify({ allowExportOnCheckFailure: true }));
  assert.equal((await readConfig(root)).allowExportOnCheckFailure, true);
  assert.equal(defaults.allowExportOnCheckFailure, false);
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

// Highlighting code: ```lang box with «…» markers.
const boxDeck = body => `---\nmarp: true\ntheme: ras\n---\n${body}\n`;
const codeOf = html => html.match(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/)[1];
const textOf = html => html.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function assertNested(html) {
  const stack = [];
  for (const [, closing, name] of html.matchAll(/<(\/?)([a-z]+)\b[^>]*>/g)) {
    if (!closing) stack.push(name);
    else assert.equal(stack.pop(), name, `Unbalanced </${name}> in ${html}`);
  }
  assert.deepEqual(stack, [], `Unclosed tags in ${html}`);
}

test('box fences frame an inline range, keep highlighting, and drop the markers', async () => {
  const theme = await readFile(path.join(pluginRoot, 'templates/theme.css'), 'utf8');
  const result = render(boxDeck('```python box\nx = «f(a=1)» + 2\n```'), theme);
  const html = result.html[0];
  assert.match(html, /<pre is="marp-pre" data-auto-scaling="downscale-only"><code class="language-python">/);
  assert.match(html, /<mark class="box">f\(a=<span class="hljs-number">1<\/span>\)<\/mark>/);
  assert.match(html, /hljs-number">2</);
  assert.doesNotMatch(codeOf(html), /[«»]/);
  assert.equal(textOf(codeOf(html)), 'x = f(a=1) + 2\n');
  assertNested(codeOf(html));
});

test('a box that starts or ends inside a highlight span keeps the HTML nested', async () => {
  const theme = await readFile(path.join(pluginRoot, 'templates/theme.css'), 'utf8');
  for (const [source, plain] of [
    ['s = "ab«cd» ef"', 's = "abcd ef"'],
    ['s = "«ab cd» ef" # «note»', 's = "ab cd ef" # note'],
    ['«def f(x):» # c\n    return x', 'def f(x): # c\n    return x'],
    ["«'a' + \"b»\"", "'a' + \"b\""],
  ]) {
    const code = codeOf(render(boxDeck('```python box\n' + source + '\n```'), theme).html[0]);
    assertNested(code);
    assert.equal(textOf(code), plain + '\n');
    assert.match(code, /<mark class="box">/);
    assert.match(code, /hljs-/);
  }
  const docstring = codeOf(render(boxDeck("```python box\n«'''doc\nmore»'''\n```"), theme).html[0]);
  assertNested(docstring);
  assert.equal(textOf(docstring), "'''doc\nmore'''\n");
  assert.match(docstring, /box-block/);
});

test('a box across lines becomes a whole-line block box without adding lines', async () => {
  const theme = await readFile(path.join(pluginRoot, 'templates/theme.css'), 'utf8');
  const code = codeOf(render(boxDeck('```python box\nimport os\nresult = «fetch(\n    url,\n    retries=3,\n)» + 1\nprint(result)\n```'), theme).html[0]);
  assertNested(code);
  assert.match(code, /<span class="box-block"><span class="box-text">result = fetch\(\n    url,\n    retries=<span class="hljs-number">3<\/span>,\n\) \+ /);
  assert.equal(code.split('<span class="box-block">').length, 2);
  assert.doesNotMatch(code, /\n\n/, 'The block box must not create an empty line');
  assert.equal(textOf(code), 'import os\nresult = fetch(\n    url,\n    retries=3,\n) + 1\nprint(result)\n');
  assert.match(code, /\) \+ <span class="hljs-number">1<\/span>\n<\/span><\/span>/);
});

test('fences without the box word are rendered exactly as plain Marp renders them', async () => {
  const theme = await readFile(path.join(pluginRoot, 'templates/theme.css'), 'utf8');
  const { Marp } = await import('@marp-team/marp-core');
  const source = boxDeck('```python\nx = «f(a=1)» + "»»"\n```\n\n```\n«plain»\n```\n\n```python boxed\ny = «1»\n```');
  const plain = new Marp({ html: true });
  plain.themeSet.add(theme);
  assert.deepEqual(render(source, theme).html, plain.render(source, { htmlAsArray: true }).html);
});

test('box markers must pair up; the error names the block', async () => {
  const theme = await readFile(path.join(pluginRoot, 'templates/theme.css'), 'utf8');
  for (const [source, message] of [
    ['x = «f(1)', /never closed/],
    ['x = f(1)»', /without a matching/],
    ['x = «f(«1»)»', /nested/],
    ['x = «»', /empty/],
  ]) {
    assert.throws(() => render(boxDeck('# T\n\n```python box\n' + source + '\n```'), theme), error => {
      assert.match(error.message, /Box code block at source line 7/);
      assert.ok(error.message.includes(JSON.stringify(source.split('\n')[0])));
      assert.match(error.message, message);
      return true;
    });
  }
});

test('doubled markers are literal characters inside a box fence', async () => {
  const theme = await readFile(path.join(pluginRoot, 'templates/theme.css'), 'utf8');
  const code = codeOf(render(boxDeck('```python box\nprint("««x»» «y»")\n```'), theme).html[0]);
  assertNested(code);
  assert.equal(textOf(code), 'print("«x» y")\n');
  assert.match(code, /<mark class="box"><span class="hljs-string">y<\/span><\/mark>/);
});

test('the Marp CLI engine file applies the same box plugin as render()', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ras-engine-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const theme = await readFile(path.join(pluginRoot, 'templates/theme.css'), 'utf8');
  const source = boxDeck('```python box\nx = «f(a=1)»\nfor i in «range(\n    3\n)»:\n    pass\n```\n\n```python\ny = «1»\n```');
  await writeFile(path.join(root, 'slides.md'), source);
  await writeFile(path.join(root, 'theme.css'), theme);
  const { marp } = await import('../scripts/project.mjs');
  await marp(['slides.md', '--no-config', '--html', '--theme-set', 'theme.css', '--output', 'index.html'], root);
  const cli = await readFile(path.join(root, 'index.html'), 'utf8');
  for (const html of render(source, theme).html) {
    const code = codeOf(html);
    assert.ok(cli.includes(code), 'CLI output must contain the same code HTML as render()');
  }
});
