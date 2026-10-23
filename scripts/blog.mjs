#!/usr/bin/env node
// Turn slides.md into a generic Markdown draft (blog/index.md plus images).
//
// Deterministic and offline: no model, no network. The Marp Core token stream
// says where each slide, heading, fence and comment lives (token.map); the
// draft is the original source with those lines edited and everything else
// left untouched, so tables, lists and inline formatting are never re-serialised.
import { copyFile, mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Marp } from '@marp-team/marp-core';
import { parseMarkers } from './marp-engine.mjs';
import { projectHash } from './project.mjs';

const USAGE = 'Usage: node scripts/blog.mjs [--screenshots] [--out <dir>] [--force]';
const HR = /^ {0,3}([-*_])( *\1){2,} *$/;
const FORBIDDEN_OUT = ['dist', '.ras', 'assets', 'scripts', 'licenses', 'node_modules'];
const IMAGE_KEYWORD = /^(?:bg|left|right|vertical|fit|contain|cover|auto|\d+(?:\.\d+)?%|(?:w|h|width|height|left|right):\S+|(?:blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|opacity|saturate|sepia)(?::\S+)?)$/i;
const MARKDOWN_IMAGE = /(?<!\\)!\[((?:[^\[\]]|\[[^\[\]]*\])*)\]\(\s*(<[^>]*>|(?:[^\s()]|\([^\s()]*\))*)((?:\s+(?:"[^"]*"|'[^']*'))?)\s*\)/g;

const normalize = source => source.replace(/\r\n/g, '\n');

// Code spans are blanked (same length) so patterns never match inside them.
function maskCode(text) { return text.replace(/(`+)[^`]*?\1/g, found => ' '.repeat(found.length)); }

// Replace regex matches that lie outside inline code; fn gets the original text and its own match.
function rewriteOutsideCode(text, regex, fn) {
  const single = new RegExp(regex.source, regex.flags.replace('g', ''));
  let result = '';
  let cursor = 0;
  for (const match of maskCode(text).matchAll(regex)) {
    const original = text.slice(match.index, match.index + match[0].length);
    result += text.slice(cursor, match.index) + fn(original, single.exec(original));
    cursor = match.index + match[0].length;
  }
  return result + text.slice(cursor);
}

// ---- R13 ------------------------------------------------------------------
export function plainText(text) {
  return text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*|__|\*|_|`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---- parsing ----------------------------------------------------------------
// Marp Core does not know title/description (those belong to Marp CLI), so they
// are registered as custom global directives before parsing.
export function parseDeck(source) {
  const text = normalize(source);
  const engine = new Marp({ html: true });
  engine.customDirectives.global.title = value => ({ title: value });
  engine.customDirectives.global.description = value => ({ description: value });
  const tokens = engine.markdown.parse(text, {});
  const lines = text.split('\n');
  const slides = [];
  let current;
  for (const token of tokens) {
    if (token.type === 'marpit_slide_open') {
      current = { index: slides.length, rawStart: token.map[0], classes: String(token.meta.marpitDirectives?.class ?? '').split(/\s+/).filter(Boolean), tokens: [], notes: [] };
      slides.push(current);
    } else if (token.type === 'marpit_slide_close') current = undefined;
    else if (current) {
      current.tokens.push(token);
      const comments = token.type === 'marpit_comment' ? [token] : token.type === 'inline' ? (token.children ?? []).filter(child => child.type === 'marpit_comment') : [];
      for (const comment of comments) if (!comment.meta?.marpitCommentParsed) current.notes.push(comment.content.trim());
    }
  }
  for (const [index, slide] of slides.entries()) {
    slide.start = index === 0 ? 0 : slide.rawStart + (HR.test(lines[slide.rawStart] ?? '') ? 1 : 0);
    slide.end = index + 1 < slides.length ? slides[index + 1].rawStart : lines.length;
  }
  const globals = engine.lastGlobalDirectives ?? {};
  return { meta: { title: globals.title, description: globals.description }, slides, lines };
}

// ---- images (R9) --------------------------------------------------------------
export function stripImageKeywords(alt) {
  return alt.split(/\s+/).filter(word => word && !IMAGE_KEYWORD.test(word)).join(' ');
}

// Path-string checks only; whether the file exists is exportBlog's concern.
export function resolveImage(raw, slide) {
  const value = raw.trim();
  if (/^(?:https?:|data:)/i.test(value)) return null;
  const where = `Slide ${slide}: image ${JSON.stringify(value)}`;
  if (/^file:/i.test(value)) throw new Error(`${where} uses a file: URL; use a path inside the deck`);
  let decoded = value;
  try { decoded = decodeURI(value); } catch { /* keep the literal text */ }
  decoded = decoded.replaceAll('\\', '/');
  if (decoded.startsWith('/') || /^[a-zA-Z]:\//.test(decoded)) throw new Error(`${where} is an absolute path; use a path inside the deck`);
  const normalized = path.posix.normalize(decoded);
  if (normalized === '..' || normalized.startsWith('../') || normalized === '.') throw new Error(`${where} points outside the deck`);
  return { file: normalized, link: decoded === normalized ? value : encodeURI(normalized) };
}

// ---- fences (R6) --------------------------------------------------------------
export function rewriteFence(token, lines, slide) {
  const start = token.map[0];
  const words = token.info.trim().split(/\s+/).filter(Boolean);
  const markup = token.markup;
  const open = lines[start];
  const at = open.indexOf(markup);
  let parsed;
  try { parsed = parseMarkers(token.content); } catch (error) {
    const first = token.content.split('\n', 1)[0];
    throw new Error(`Box code block on slide ${slide} at source line ${start + 1} (first line: ${JSON.stringify(first)}): ${error.message}`);
  }
  const info = words.filter(word => word !== 'box').join(' ');
  const indent = open.slice(0, at).replace(/\S/g, ' ');
  const original = token.content.split('\n');
  const replacement = parsed.text.split('\n');
  const body = [];
  for (let index = 0; index < replacement.length; index++) {
    const line = lines[start + 1 + index] ?? '';
    const before = original[index] ?? '';
    const prefix = line.endsWith(before) ? line.slice(0, line.length - before.length) : indent;
    body.push(replacement[index] === '' ? prefix.trimEnd() : prefix + replacement[index]);
  }
  // Content ends with a newline, so split leaves one trailing empty item.
  if (replacement.at(-1) === '') body.pop();
  return { open: open.slice(0, at) + markup + info, body };
}

// ---- headings (R4, R5) --------------------------------------------------------
export function headingLevelFor(level, { isSection, hasSection }) {
  const offset = hasSection && !isSection ? 2 : 1;
  return Math.min(6, level + offset);
}

function frontmatter(meta, now) {
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const rows = [`title: ${JSON.stringify(meta.title)}`, `date: ${date}`];
  if (meta.description) rows.push(`description: ${JSON.stringify(meta.description)}`);
  return `---\n${rows.join('\n')}\n---\n`;
}

const slug = number => `slide-${String(number).padStart(3, '0')}.png`;

// ---- the conversion ---------------------------------------------------------------
export function slidesToArticle(source, { now = new Date(), screenshots = false } = {}) {
  const deck = parseDeck(source);
  const { lines } = deck;
  const warnings = [];
  const images = [];
  const hasSection = deck.slides.some(slide => slide.classes.includes('section'));
  const parts = [];
  let firstHeading;
  // Labels of reference definitions; markdown-it resolves `![x][label]` only for these.
  const definitions = new Set([...deck.lines.join('\n').matchAll(/^ {0,3}\[([^\]]+)\]:\s*\S/gm)].map(match => match[1].replace(/\s+/g, ' ').trim().toLowerCase()));

  for (const slide of deck.slides) {
    const number = slide.index + 1;
    const entries = new Map(); // line index -> { text, keep } ; text null deletes the line
    const fenceLines = new Set();
    const skipMarkdown = new Set(); // lines where Markdown is not parsed or not text
    const set = (index, text, keep = false) => entries.set(index, { text, keep });
    for (let index = slide.start; index < slide.end; index++) set(index, lines[index]);
    const isSection = slide.classes.includes('section');
    const isTitle = slide.classes.includes('title');
    const isStatement = slide.classes.includes('statement');
    let depth = 0;
    let headingSeen = false;
    let slideHeading;

    if (slide.index === 0) {
      const front = slide.tokens.find(token => token.type === 'front_matter');
      if (front) for (let index = front.map[0]; index < front.map[1]; index++) set(index, null);
    }

    // Comments first: they are removed whatever their kind; notes were collected by parseDeck.
    for (const token of slide.tokens) {
      if (token.type === 'marpit_comment' && token.map) {
        for (let index = token.map[0]; index < token.map[1]; index++) { set(index, null); skipMarkdown.add(index); }
      } else if (token.type === 'inline' && token.map && token.children?.some(child => child.type === 'marpit_comment')) {
        const [from, to] = token.map;
        const joined = Array.from({ length: to - from }, (_, offset) => entries.get(from + offset).text).join('\n');
        const cleaned = joined.replace(/<!--[\s\S]*?-->/g, '').split('\n');
        const originals = joined.split('\n');
        for (let offset = 0; offset < to - from; offset++) {
          const line = cleaned[offset];
          const trailing = /[ \t]*$/.exec(originals[offset] ?? '')[0];
          set(from + offset, line === undefined ? null : line === originals[offset] ? line : line.replace(/[ \t]+$/, '') + trailing);
        }
      }
    }

    // Fences, headings.
    for (let position = 0; position < slide.tokens.length; position++) {
      const token = slide.tokens[position];
      if (/^(?:blockquote|bullet_list|ordered_list)_open$/.test(token.type)) depth++;
      else if (/^(?:blockquote|bullet_list|ordered_list)_close$/.test(token.type)) depth--;
      else if (token.type === 'html_block' && token.map) {
        for (let index = token.map[0]; index < token.map[1]; index++) skipMarkdown.add(index);
      } else if (token.type === 'code_block' && token.map) {
        for (let index = token.map[0]; index < token.map[1]; index++) fenceLines.add(index);
      } else if (token.type === 'fence' && token.map) {
        const [from, to] = token.map;
        for (let index = from; index < to; index++) { fenceLines.add(index); skipMarkdown.add(index); }
        const words = token.info.trim().split(/\s+/).filter(Boolean);
        if (screenshots && words[0] === 'mermaid') {
          for (let index = from; index < to; index++) set(index, null);
          continue;
        }
        // The closing fence can carry the same quote or list prefix as the lines inside.
        const closer = to - from >= 2 && new RegExp(`^[\\s>]*${token.markup[0] === '~' ? '~' : '`'}{${token.markup.length},}\\s*$`).test(lines[to - 1]) ? to - 1 : -1;
        for (let index = from; index < to; index++) set(index, lines[index], true);
        if (words.includes('box')) {
          const { open, body } = rewriteFence(token, lines, number);
          set(from, open, true);
          body.forEach((text, offset) => set(from + 1 + offset, text, true));
          for (let index = from + 1 + body.length; index < (closer >= 0 ? closer : to); index++) set(index, null, true);
        }
      } else if (token.type === 'heading_open' && token.map) {
        const inline = slide.tokens[position + 1];
        const text = (inline?.content ?? '').replace(/<!--[\s\S]*?-->/g, '').trim();
        if (!firstHeading) firstHeading = plainText(text);
        slideHeading ??= plainText(text);
        const [from, to] = token.map;
        const level = Number(token.tag.slice(1));
        const isFirst = !headingSeen && depth === 0;
        if (depth === 0) headingSeen = true;
        const body = text.replace(/<br\s*\/?>/gi, ' ');
        let replacement;
        if (depth > 0) {
          // Headings inside lists or quotes keep their level; only <br> is flattened.
          for (let index = from; index < to; index++) set(index, entries.get(index).text?.replace(/<br\s*\/?>/gi, ' '));
          continue;
        } else if (isTitle && isFirst) replacement = null;
        else if (isStatement) replacement = body;
        else replacement = `${'#'.repeat(headingLevelFor(level, { isSection, hasSection }))} ${body}`;
        set(from, replacement);
        for (let index = from + 1; index < to; index++) set(index, null);
      }
    }

    // Plain-text rewrites on everything that is neither fence nor already removed.
    let frames = 0;
    let handledImages = 0;
    for (const [index, entry] of entries) {
      if (entry.keep || entry.text === null || fenceLines.has(index)) continue;
      let text = entry.text;
      const before = text;
      text = rewriteOutsideCode(text, /<span\b[^>]*>\s*<\/span>/gi, tag => {
        const klass = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
        if (!klass || !(klass[1] ?? klass[2]).split(/\s+/).includes('hl')) return tag;
        frames++;
        return '';
      });
      if (/<img\b(?![^>]*>)/i.test(maskCode(text))) throw new Error(`Slide ${number}: an <img> tag that continues on the next line is not supported; put the whole tag on one line`);
      text = rewriteOutsideCode(text, /<img\b[^>]*>/gi, tag => {
        if (screenshots) return '';
        const src = /(\bsrc\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(tag);
        if (!src) return tag;
        const resolved = resolveImage(src[2] ?? src[3] ?? src[4], number);
        if (!resolved) return tag;
        if (!images.includes(resolved.file)) images.push(resolved.file);
        return tag.replace(src[0], `${src[1]}"${resolved.link}"`);
      });
      if (!skipMarkdown.has(index)) {
        for (const reference of maskCode(text).matchAll(/(?<!\\)!\[([^\]]*)\](?:\[([^\]]*)\])?(?!\()/g)) {
          if (definitions.has((reference[2] || reference[1]).replace(/\s+/g, ' ').trim().toLowerCase())) throw new Error(`Slide ${number}: reference-style images (${reference[0]}) are not supported; use ![alt](path)`);
        }
        text = rewriteOutsideCode(text, MARKDOWN_IMAGE, (original, parsed) => {
          // Marp lifts background images out of the token stream, so they are not counted.
          if (!/(?:^|\s)bg(?:\s|$)/i.test(parsed?.[1] ?? '')) handledImages++;
          if (screenshots || !parsed) return screenshots ? '' : original;
          const alt = stripImageKeywords(parsed[1]);
          const destination = parsed[2].startsWith('<') ? parsed[2].slice(1, -1) : parsed[2];
          const resolved = resolveImage(destination, number);
          if (!resolved) return `![${alt}](${parsed[2]}${parsed[3]})`;
          if (!images.includes(resolved.file)) images.push(resolved.file);
          if (/(?:^|\s)bg(?:\s|$)/i.test(parsed[1])) warnings.push(`Slide ${number}: background image ${resolved.file} became a regular image in the article`);
          const link = /[\s()]/.test(resolved.link) ? `<${resolved.link}>` : resolved.link;
          return `![${alt}](${link}${parsed[3]})`;
        });
      }
      if (text !== before) set(index, text.trim() === '' && before.trim() !== '' ? null : text);
    }
    const markdownImages = slide.tokens.reduce((sum, token) => sum + (token.type === 'inline' ? token.children.filter(child => child.type === 'image').length : 0), 0);
    if (markdownImages !== handledImages) throw new Error(`Slide ${number}: found ${markdownImages} Markdown image(s) but could convert ${handledImages}. Not supported: images split over several lines, images in a heading that the article drops (such as a title slide's heading) and reference-style images. A bg image must be alone on its line. Use ![alt](path) on one line`);
    if (frames) warnings.push(`Slide ${number}: removed ${frames} screenshot frame${frames === 1 ? '' : 's'} (class hl); they mark positions on the slide and have no meaning in an article`);

    const body = [];
    if (screenshots) {
      const alt = (slideHeading || `Slide ${number}`).replace(/([[\]])/g, '\\$1');
      body.push({ text: `![${alt}](slides/${slug(number)})`, keep: false }, { text: '', keep: false });
    }
    for (let index = slide.start; index < slide.end; index++) {
      const entry = entries.get(index);
      if (entry.text !== null) body.push({ text: entry.text, keep: entry.keep || fenceLines.has(index) });
    }
    for (const note of slide.notes) body.push({ text: '', keep: false }, { text: `<!-- note: ${note.replaceAll('-->', '--&gt;')} -->`, keep: false });
    parts.push(body);
  }

  const markdownLines = [];
  for (const [index, body] of parts.entries()) {
    if (index) markdownLines.push({ text: '', keep: false });
    markdownLines.push(...body);
  }
  const collapsed = [];
  for (const entry of markdownLines) {
    const blank = !entry.keep && entry.text.trim() === '';
    if (blank && (!collapsed.length || (!collapsed.at(-1).keep && collapsed.at(-1).text === ''))) continue;
    collapsed.push(blank ? { text: '', keep: false } : entry);
  }
  while (collapsed.length && !collapsed.at(-1).keep && collapsed.at(-1).text === '') collapsed.pop();

  const title = deck.meta.title || firstHeading || 'Untitled';
  const markdown = frontmatter({ title, description: deck.meta.description }, now) + '\n' + collapsed.map(entry => entry.text).join('\n') + '\n';
  return { markdown, images, slides: deck.slides.length, warnings };
}

// ---- command line -----------------------------------------------------------------------
export function parseBlogArgs(argv) {
  const options = { screenshots: false, out: 'blog', force: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--screenshots') options.screenshots = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--out') {
      const value = argv[++index];
      if (!value || value.startsWith('--')) throw new Error(`--out needs a directory. ${USAGE}`);
      options.out = value;
    } else throw new Error(`Unknown option: ${arg}. ${USAGE}`);
  }
  return options;
}

async function previewsFor(root, count, warnings) {
  const reportFile = path.join(root, '.ras', 'check.json');
  let report;
  try {
    const saved = JSON.parse(await readFile(reportFile, 'utf8'));
    const fresh = saved.sourceHash === await projectHash(root)
      && saved.pages?.length === count
      && saved.pages.every(page => page.preview && existsSync(path.join(root, page.preview)));
    if (fresh) report = saved;
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
  }
  if (!report) {
    // A dynamic import keeps the pure conversion free of the browser dependency.
    const { check } = await import('./deck.mjs');
    ({ report } = await check(root, { tolerateFailure: true }));
    if (report.slides !== count) throw new Error(`The check produced ${report.slides} previews; the source has ${count} slides`);
  }
  if (!report.passed) warnings.push('The layout check did not pass, so the screenshots may show problems; see .ras/check.json');
  return report.pages.map(page => path.join(root, page.preview));
}

export async function exportBlog(root = process.cwd(), { out = 'blog', screenshots = false, force = false, now } = {}) {
  root = path.resolve(root);
  const source = await readFile(path.join(root, 'slides.md'), 'utf8');
  const article = slidesToArticle(source, { now, screenshots });
  const target = path.resolve(root, out);
  const relative = path.relative(root, target);
  if (relative === '') throw new Error('Choose an output directory other than the deck root');
  if (FORBIDDEN_OUT.includes(relative.split(path.sep)[0].toLowerCase()) && !relative.startsWith('..')) {
    throw new Error(`Do not write the draft inside ${relative.split(path.sep)[0]}/; it holds tool or build files`);
  }
  const indexFile = path.join(target, 'index.md');
  if (existsSync(indexFile) && !force) throw new Error(`${path.relative(root, indexFile) || indexFile} already exists. Pass --force to replace it (images are overwritten too; other files are left alone)`);
  const base = await realpath(root);
  for (const image of article.images) {
    const file = path.join(root, image);
    let real;
    try { real = await realpath(file); } catch { throw new Error(`Image not found: ${image}`); }
    if (!real.startsWith(base + path.sep)) throw new Error(`Image resolves outside the deck: ${image}`);
    if (!(await stat(real)).isFile()) throw new Error(`Image is not a file: ${image}`);
  }
  const warnings = [...article.warnings];
  const conflictsIn = async pairs => {
    if (force) return;
    const conflicts = [];
    for (const [from, to] of pairs) {
      if (existsSync(to) && !(await readFile(from)).equals(await readFile(to))) conflicts.push(path.relative(root, to));
    }
    if (conflicts.length) throw new Error(`These files already exist with different content and would be overwritten: ${conflicts.join(', ')}. Pass --force to replace them`);
  };
  // Checked before the screenshots are produced: that step can rebuild dist/.
  await conflictsIn(article.images.map(image => [path.join(root, image), path.join(target, image)]));
  const shots = screenshots ? await previewsFor(root, article.slides, warnings) : [];
  await conflictsIn(shots.map((file, index) => [file, path.join(target, 'slides', slug(index + 1))]));

  await mkdir(target, { recursive: true });
  for (const image of article.images) {
    await mkdir(path.dirname(path.join(target, image)), { recursive: true });
    await copyFile(path.join(root, image), path.join(target, image));
  }
  if (screenshots) {
    await mkdir(path.join(target, 'slides'), { recursive: true });
    for (const [index, file] of shots.entries()) await copyFile(file, path.join(target, 'slides', slug(index + 1)));
  }
  await writeFile(indexFile, article.markdown);
  console.log(`Wrote ${indexFile}`);
  console.log(`${article.slides} slides, ${article.images.length} image${article.images.length === 1 ? '' : 's'} copied${screenshots ? `, ${shots.length} screenshots` : ''}`);
  if (article.images.length) console.log('Image permissions in sources.md were obtained for the presentation; confirm them again before publishing the article (see the image-rights guide).');
  for (const warning of warnings) console.warn(`WARNING: ${warning}`);
  return { ...article, warnings, out: target, indexFile };
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  try { await exportBlog(process.cwd(), parseBlogArgs(process.argv.slice(2))); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
