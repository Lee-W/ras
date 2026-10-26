import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDeck, slidesToArticle, exportBlog, parseBlogArgs } from '../scripts/blog.mjs';
import { initDeck } from '../scripts/scaffold.mjs';
import { render } from '../scripts/project.mjs';

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const now = new Date(2026, 0, 2, 12);
const head = '---\nmarp: true\ntheme: ras\n---\n';
const article = (source, options) => slidesToArticle(head + source, { now, ...options });
const text = (source, options) => article(source, options).markdown.replace(/^---\n[\s\S]*?\n---\n\n/, '');

test('parseDeck reads title and description through custom global directives', () => {
  const deck = parseDeck('---\nmarp: true\ntitle: Original talk\ndescription: A short description\n---\n# Heading\n');
  assert.equal(deck.meta.title, 'Original talk');
  assert.equal(deck.meta.description, 'A short description');
  assert.equal(parseDeck('# Only a heading\n').meta.title, undefined);
});

test('parseDeck reads per-slide classes from marpitDirectives, including _class and headingDivider decks', () => {
  const deck = parseDeck('---\nmarp: true\nclass: lead\n---\n<!-- _class: section dark -->\n# One\n\n---\n\n# Two\n');
  assert.deepEqual(deck.slides.map(slide => slide.classes), [['section', 'dark'], ['lead']]);
  assert.equal(deck.slides[0].start, 0);
  assert.equal(deck.lines[deck.slides[1].start], '', 'the separator line is not part of the slide');
  const divided = parseDeck('---\nmarp: true\nheadingDivider: 2\n---\n# A\n\n## B\n\ntext\n\n## C\n');
  assert.equal(divided.slides.length, 3);
  assert.equal(divided.slides[0].start, 0, 'the first slide starts at the top and the converter drops front matter itself');
  assert.deepEqual(divided.slides.slice(1).map(slide => divided.lines[slide.start]), ['## B', '## C']);
});

test('parseDeck notes match render().comments for the starter deck', async () => {
  const source = await readFile(path.join(pluginRoot, 'templates/slides.md'), 'utf8');
  const theme = await readFile(path.join(pluginRoot, 'templates/theme.css'), 'utf8');
  const deck = parseDeck(source);
  const rendered = render(source, theme);
  assert.equal(deck.slides.length, rendered.count);
  for (const [index, slide] of deck.slides.entries()) {
    assert.equal(slide.notes.join('\n\n').trim(), rendered.comments[index].join('\n\n').trim(), `slide ${index + 1}`);
  }
});

test('frontmatter quotes title, uses the injected date, and omits a missing description', () => {
  const quoted = slidesToArticle('---\nmarp: true\ntitle: "Say: \\"hi\\" # now"\n---\n# Heading\n', { now });
  const lines = quoted.markdown.split('\n');
  assert.equal(lines[0], '---');
  assert.equal(JSON.parse(lines[1].slice('title: '.length)), 'Say: "hi" # now');
  assert.equal(lines[2], 'date: 2026-01-02');
  assert.equal(lines[3], '---');
  assert.doesNotMatch(quoted.markdown, /description:/);
  const fallback = slidesToArticle('# **Bold** `title`<br>here\n', { now });
  assert.match(fallback.markdown, /^title: "Bold title here"$/m);
  assert.match(slidesToArticle('Just text\n', { now }).markdown, /^title: "Untitled"$/m);
});

test('title slide heading moves to frontmatter and its other lines lead the article', () => {
  const result = text('<!-- _class: title -->\n# The talk\n\nA subtitle line\n\n---\n\n# Next\n');
  assert.doesNotMatch(result, /The talk/);
  assert.match(result, /^A subtitle line\n\n## Next\n/);
});

test('section slides become parts and other slide headings drop one level below them', () => {
  const sections = text('<!-- _class: section -->\n# Part\n\n---\n\n# Slide\n\n## Sub\n\ntext\n');
  assert.match(sections, /^## Part\n\n### Slide\n\n#### Sub\n\ntext\n$/);
  const plain = text('# One\n\n---\n\n# Two\n\n###### Deep\n');
  assert.match(plain, /^## One\n\n## Two\n\n###### Deep\n$/, 'levels are capped at six');
  assert.match(text('Setext title\n============\n\nbody\n'), /^## Setext title\n\nbody\n$/);
});

test('statement headings become paragraphs and untitled slides join the previous section', () => {
  const result = text('<!-- _class: statement -->\n# Leave room<br>for a **pause**.\n\n---\n\n# Topic\n\n---\n\nUntitled follow-up.\n');
  assert.match(result, /^Leave room for a \*\*pause\*\*\.\n\n## Topic\n\nUntitled follow-up\.\n$/);
});

test('box fences lose markers and the box word while doubled markers stay literal', () => {
  const source = '# Code\n\n```python box\nx = «1 + 1»\ny = ««literal»»\n```\n\n```text\nkeep «this»\n```\n\n- item\n\n  ```js box\n  const a = «b»;\n  ```\n';
  const result = text(source);
  assert.match(result, /^```python\nx = 1 \+ 1\ny = «literal»\n```$/m);
  assert.match(result, /^```text\nkeep «this»\n```$/m);
  assert.match(result, /^ {2}```js\n {2}const a = b;\n {2}```$/m);
  assert.doesNotMatch(result, /box/);
});

test('a malformed box marker names the slide and source line', () => {
  assert.throws(
    () => article('# One\n\n---\n\n```python box\nx = «1\n```\n'),
    error => /slide 2/.test(error.message) && /source line 9/.test(error.message) && /never closed/.test(error.message),
  );
});

test('mermaid fences are kept as source in the default mode', () => {
  assert.match(text('# Diagram\n\n```mermaid\nflowchart LR\n  A --> B\n```\n'), /```mermaid\nflowchart LR\n {2}A --> B\n```/);
});

test('raw HTML layouts and credits survive while screenshot frames are dropped with a warning', () => {
  const source = '# Heading<br>two\n\n<div class="columns">\n<div><p>Left</p></div>\n<div><p>Right</p></div>\n</div>\n\n<div class="credit">Photo by Someone, CC BY</div>\n\n<span class="hl" style="left:1px"></span>\n\n---\n\n# Second\n\n<span class="hl"></span><span class="hl"></span>\n';
  const result = article(source);
  assert.match(result.markdown, /^## Heading two$/m);
  assert.match(result.markdown, /<div class="columns">\n<div><p>Left<\/p><\/div>\n<div><p>Right<\/p><\/div>\n<\/div>/);
  assert.match(result.markdown, /Photo by Someone, CC BY/);
  assert.doesNotMatch(result.markdown, /class="hl"/);
  assert.deepEqual(result.warnings.map(warning => warning.match(/^Slide (\d+): removed (\d+)/).slice(1)), [['1', '1'], ['2', '2']]);
  const shots = article(source, { screenshots: true });
  assert.match(shots.markdown, /Photo by Someone, CC BY/);
});

test('directive comments vanish and speaker notes follow their slide as comments', () => {
  const result = text('<!-- paginate: true -->\n<!-- _class: closing -->\n# One\n\nBody with <!-- an inline note --> text.\n\n<!-- First note. -->\n\n---\n\n# Two\n\n<!--\nMulti\nline\n-->\n');
  assert.doesNotMatch(result, /paginate|_class/);
  assert.match(result, /^Body with {1,2}text\.$/m);
  const notes = result.match(/<!-- note: [\s\S]*?-->/g);
  assert.deepEqual(notes, ['<!-- note: an inline note -->', '<!-- note: First note. -->', '<!-- note: Multi\nline -->']);
  assert.ok(result.indexOf('First note.') < result.indexOf('## Two'), 'notes stay with their own slide');
});

test('image alt text loses Marp keywords and remote images stay untouched', () => {
  const source = '# Pictures\n\n![bg left:40% blur:5px A nice view](./assets/view.png)\n\n![w:300 fit](assets/plain.png "Title")\n\n![remote](https://example.com/a.png)\n\n<img src="./assets/tag.png" alt="tag">\n\nUse `![code](span.png)` as text.\n';
  const result = article(source);
  assert.match(result.markdown, /^!\[A nice view\]\(assets\/view\.png\)$/m);
  assert.match(result.markdown, /^!\[\]\(assets\/plain\.png "Title"\)$/m);
  assert.match(result.markdown, /^!\[remote\]\(https:\/\/example\.com\/a\.png\)$/m);
  assert.match(result.markdown, /<img src="assets\/tag\.png" alt="tag">/);
  assert.match(result.markdown, /`!\[code\]\(span\.png\)`/);
  assert.deepEqual(result.images, ['assets/view.png', 'assets/plain.png', 'assets/tag.png']);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /Slide 1: background image assets\/view\.png/);
});

test('images outside the deck, absolute paths, and missing files are rejected', async t => {
  assert.throws(() => article('![x](../secret.png)\n'), /Slide 1.*outside the deck/);
  assert.throws(() => article('![x](assets/../../secret.png)\n'), /outside the deck/);
  assert.throws(() => article('# One\n\n---\n\n![x](/etc/passwd)\n'), /Slide 2.*absolute/);
  assert.throws(() => article('<img src="file:///tmp/a.png">\n'), /file: URL/);
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ras-blog-missing-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const deck = await initDeck(path.join(temporary, 'talk'));
  await writeFile(path.join(deck, 'slides.md'), head + '# One\n\n![x](assets/missing.png)\n');
  await assert.rejects(exportBlog(deck, { now }), /Image not found: assets\/missing\.png/);
  await assert.rejects(access(path.join(deck, 'blog')), { code: 'ENOENT' }, 'a failed export leaves no partial output');
});

test('screenshot mode leads each slide with its screenshot and drops original images and diagrams', () => {
  const source = '<!-- _class: title -->\n# Opening\n\n---\n\n# Picture [one]\n\n![bg](assets/a.png)\n\n<img src="assets/b.png">\n\n```mermaid\nA --> B\n```\n\n<div class="credit">Credit line</div>\n\nKept text.\n\n```python\nprint("kept")\n```\n';
  const result = article(source, { screenshots: true });
  assert.match(result.markdown, /^!\[Opening\]\(slides\/slide-001\.png\)$/m);
  assert.match(result.markdown, /^!\[Picture \\\[one\\\]\]\(slides\/slide-002\.png\)$/m);
  assert.doesNotMatch(result.markdown, /assets\/[ab]\.png|mermaid|A --> B/);
  assert.match(result.markdown, /Credit line/);
  assert.match(result.markdown, /Kept text\./);
  assert.match(result.markdown, /print\("kept"\)/);
  assert.deepEqual(result.images, []);
});

async function makeDeck(t, slides) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ras-blog-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const deck = await initDeck(path.join(temporary, 'talk'));
  await writeFile(path.join(deck, 'slides.md'), head + slides);
  return deck;
}

test('exportBlog writes index.md and copies referenced images under the same relative paths', async t => {
  const deck = await makeDeck(t, '# One\n\n![alt](./assets/pics/a.png)\n\n---\n\n# Two\n\n![again](assets/pics/a.png)\n');
  await mkdir(path.join(deck, 'assets/pics'), { recursive: true });
  const bytes = Buffer.from('not a real image');
  await writeFile(path.join(deck, 'assets/pics/a.png'), bytes);
  const result = await exportBlog(deck, { now });
  const markdown = await readFile(path.join(deck, 'blog/index.md'), 'utf8');
  assert.equal(markdown, result.markdown);
  assert.match(markdown, /!\[alt\]\(assets\/pics\/a\.png\)/);
  assert.deepEqual(await readFile(path.join(deck, 'blog/assets/pics/a.png')), bytes);
  assert.deepEqual(result.images, ['assets/pics/a.png'], 'one file is listed and copied once');
  const elsewhere = path.join(path.dirname(deck), 'other-blog');
  await exportBlog(deck, { now, out: elsewhere });
  assert.equal(await readFile(path.join(elsewhere, 'index.md'), 'utf8'), markdown);
});

test('exportBlog refuses to replace an existing draft without --force and rejects outputs inside dist', async t => {
  const deck = await makeDeck(t, '# One\n');
  await exportBlog(deck, { now });
  const file = path.join(deck, 'blog/index.md');
  await writeFile(file, 'my edited draft');
  await assert.rejects(exportBlog(deck, { now }), /already exists.*--force/);
  assert.equal(await readFile(file, 'utf8'), 'my edited draft');
  await writeFile(path.join(deck, 'blog/notes.txt'), 'keep me');
  await exportBlog(deck, { now, force: true });
  assert.match(await readFile(file, 'utf8'), /^---\ntitle:/);
  assert.equal(await readFile(path.join(deck, 'blog/notes.txt'), 'utf8'), 'keep me');
  for (const out of ['dist/blog', 'dist', '.ras/x', 'assets', 'scripts/out', 'node_modules/x', '.']) {
    await assert.rejects(exportBlog(deck, { now, out }), /deck root|Do not write/, out);
  }
});

test('parseBlogArgs rejects unknown flags', () => {
  assert.deepEqual(parseBlogArgs([]), { screenshots: false, out: 'blog', force: false });
  assert.deepEqual(parseBlogArgs(['--screenshots', '--force', '--out', 'x']), { screenshots: true, out: 'x', force: true });
  assert.throws(() => parseBlogArgs(['--slides']), /Unknown option: --slides.*Usage: node scripts\/blog\.mjs/);
  assert.throws(() => parseBlogArgs(['--out']), /--out needs a directory/);
  assert.throws(() => parseBlogArgs(['extra']), /Unknown option: extra/);
});

test('box fences inside quotes and lists keep their closing fence, quote markers and blank quote lines', () => {
  const quote = text('# Q\n\n> ```python box\n> a = «1»\n>\n> b = 2\n> ```\n\nafter\n');
  assert.match(quote, /^> ```python\n> a = 1\n>\n> b = 2\n> ```\n\nafter\n$/m);
  const nested = text('# L\n\n- item\n\n  > ```js box\n  > x = «y»\n  >\n  > z\n  > ```\n\nafter\n');
  assert.match(nested, /^ {2}> ```js\n {2}> x = y\n {2}>\n {2}> z\n {2}> ```\n\nafter\n$/m);
  const plain = text('# P\n\n```python box\na = «1»\n\nb\n```\n\nafter\n');
  assert.match(plain, /^```python\na = 1\n\nb\n```\n\nafter\n$/m);
});

test('span and img rewrites leave inline code, indented code and fenced examples alone', () => {
  const source = '# Code\n\nInline `<span class="hl"></span>` and `<img src="../x.png">` stay.\n\n    <span class="hl"></span>\n    <img src="../y.png">\n\n```html\n<span class="hl"></span>\n<img src="../z.png">\n```\n\n```text box\n<img src="/abs.png"> «keep»\n```\n';
  const result = article(source);
  assert.match(result.markdown, /`<span class="hl"><\/span>` and `<img src="\.\.\/x\.png">` stay\./);
  assert.match(result.markdown, /^ {4}<span class="hl"><\/span>\n {4}<img src="\.\.\/y\.png">$/m);
  assert.match(result.markdown, /```html\n<span class="hl"><\/span>\n<img src="\.\.\/z\.png">\n```/);
  assert.match(result.markdown, /<img src="\/abs\.png"> keep/);
  assert.deepEqual(result.images, []);
  assert.deepEqual(result.warnings, []);
});

test('reference-style, unquoted and multi-line images are handled or rejected with the slide number', () => {
  assert.throws(() => article('# One\n\n---\n\n![ref][pic]\n\n[pic]: ../secret.png\n'), /Slide 2.*reference-style/);
  assert.throws(() => article('![bg][pic]\n\n[pic]: ../secret.png\n'), /Slide 1.*reference-style/);
  assert.throws(() => article('# One\n\n<img\n  src="../secret.png">\n'), /Slide 1: an <img> tag that continues on the next line/);
  assert.throws(() => article('<img src=../secret.png>\n'), /Slide 1.*outside the deck/);
  assert.throws(() => article('![multi\nline](../secret.png)\n'), /Slide 1: found 1 Markdown image\(s\) but could convert 0.*bg image must be alone/);
  const unquoted = article('<img src=./assets/a.png alt=x>\n');
  assert.match(unquoted.markdown, /<img src="assets\/a\.png" alt=x>/);
  assert.deepEqual(unquoted.images, ['assets/a.png']);
});

test('exportBlog refuses to overwrite different existing images without --force', async t => {
  const deck = await makeDeck(t, '# One\n\n![alt](assets/a.png)\n');
  await mkdir(path.join(deck, 'assets'), { recursive: true });
  await writeFile(path.join(deck, 'assets/a.png'), 'new bytes');
  await mkdir(path.join(deck, 'out/assets'), { recursive: true });
  await writeFile(path.join(deck, 'out/assets/a.png'), 'someone else');
  await assert.rejects(exportBlog(deck, { now, out: 'out' }), error => /different content/.test(error.message) && error.message.includes(path.join('out', 'assets', 'a.png')) && /--force/.test(error.message));
  assert.equal(await readFile(path.join(deck, 'out/assets/a.png'), 'utf8'), 'someone else');
  await assert.rejects(access(path.join(deck, 'out/index.md')), { code: 'ENOENT' }, 'nothing is written when a conflict is found');
  await writeFile(path.join(deck, 'out/assets/a.png'), 'new bytes');
  await exportBlog(deck, { now, out: 'out' });
  await writeFile(path.join(deck, 'out/assets/a.png'), 'someone else');
  await rm(path.join(deck, 'out/index.md'));
  await exportBlog(deck, { now, out: 'out', force: true });
  assert.equal(await readFile(path.join(deck, 'out/assets/a.png'), 'utf8'), 'new bytes');
});

test('inline comment removal keeps a Markdown hard break', () => {
  assert.equal(text('Line one <!-- note -->  \nline two\n').split('\n').slice(0, 2).join('|'), 'Line one  |line two');
  assert.match(text('Plain <!-- note -->\nnext\n'), /^Plain\nnext$/m);
});

test('output directory checks ignore case', async t => {
  const deck = await makeDeck(t, '# One\n');
  for (const out of ['DIST/blog', 'Assets', 'Node_Modules/x']) await assert.rejects(exportBlog(deck, { now, out }), /Do not write/, out);
});

test('escaped image syntax is not treated as an image', () => {
  const result = article('Literal \\![x](../outside.png) text.\n');
  assert.match(result.markdown, /Literal \\!\[x\]\(\.\.\/outside\.png\) text\./);
  assert.deepEqual(result.images, []);
});

test('bracket text that is not an image reference passes through, defined references are rejected', () => {
  const plain = text('Wow ![ not an image] ok\n\nSee ![note] here\n\n![a [b]](assets/a.png)\n');
  assert.match(plain, /^Wow !\[ not an image\] ok\n\nSee !\[note\] here\n\n!\[a \[b\]\]\(assets\/a\.png\)\n$/);
  assert.throws(() => article('# One\n\n![x][r]\n\n[r]: ../secret.png\n'), /Slide 1: reference-style images/);
  assert.throws(() => article('![note]\n\n[note]: ../secret.png\n'), /reference-style/);
});

test('image destinations with balanced parentheses are rewritten whole', () => {
  const result = article('![a](./assets/a(1).png)\n');
  assert.match(result.markdown, /^!\[a\]\(<assets\/a\(1\)\.png>\)$/m);
  assert.deepEqual(result.images, ['assets/a(1).png']);
});

test('reference labels match after case folding and whitespace collapsing', () => {
  assert.throws(() => article('![bg][My  Pic]\n\n[my pic]: ../secret.png\n'), /Slide 1: reference-style images/);
});
