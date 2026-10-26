import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { Marp } from '@marp-team/marp-core';
import puppeteer from 'puppeteer';
import { diagramFonts } from './fonts.mjs';
export { kitCss } from './kit-css.mjs';
import { boxPlugin } from './marp-engine.mjs';
export { prepareFonts } from './fonts.mjs';

const require = createRequire(import.meta.url);
export const engineFile = fileURLToPath(new URL('./marp-engine.mjs', import.meta.url));
export const defaults = { minTextSize: 24, minCodeSize: 18, minCreditSize: 14, allowExportOnCheckFailure: false };
const booleanSettings = new Set(['allowExportOnCheckFailure']);

export async function browserPath() {
  const selected = process.env.RAS_BROWSER_PATH || await puppeteer.executablePath();
  if (!existsSync(selected)) {
    throw new Error('Browser missing. Run npx puppeteer browsers install chrome, or set RAS_BROWSER_PATH to Chrome/Chromium.');
  }
  return selected;
}

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${path.basename(command)} failed (${signal || code})`)));
  });
}

export async function marp(args, cwd) {
  await run(process.execPath, [require.resolve('@marp-team/marp-cli/marp-cli.js'), '--no-stdin', '--engine', engineFile, ...args], { cwd });
}

export function render(markdown, theme) {
  const engine = new Marp({ html: true }).use(boxPlugin);
  engine.themeSet.add(theme);
  const result = engine.render(markdown, { htmlAsArray: true });
  return { ...result, count: result.html.length };
}

// Two layers of fingerprint. contentHash covers what the speaker writes, so
// reviews stay valid when only the kit tooling is upgraded. toolingHash covers
// the copied kit (scripts, dependencies, notices).
async function hashInputs(root, { files, folders }) {
  const hash = createHash('sha256');
  async function add(relative) {
    const full = path.join(root, relative);
    if (!existsSync(full)) return;
    const entries = await readdir(full, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) throw new Error(`Use real project assets rather than symlinks: ${relative}/${entry.name}`);
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) await add(child);
      else { hash.update(child); hash.update(await readFile(path.join(root, child))); }
    }
  }
  for (const file of files) {
    if (existsSync(path.join(root, file))) { hash.update(file); hash.update(await readFile(path.join(root, file))); }
  }
  for (const folder of folders) await add(folder);
  return hash.digest('hex');
}

// renderHash is the rendering subset of the content. It is the review
// sourceHash and the machine-check key; brief.md, outline.md, and sources.md
// join it in contentHash and in the review contextHash, so a brief edit stales
// reviews but not the machine check.
export const renderHash = root => hashInputs(root, {
  files: ['slides.md', 'theme.css', 'ras.config.json'],
  folders: ['assets', 'images'],
});

export const contentHash = root => hashInputs(root, {
  files: ['brief.md', 'outline.md', 'slides.md', 'sources.md', 'theme.css', 'ras.config.json'],
  folders: ['assets', 'images'],
});

export const toolingHash = root => hashInputs(root, {
  files: ['package.json', 'package-lock.json', 'justfile', 'RAS-LICENSE', 'RAS-NOTICE.md'],
  folders: ['scripts', 'licenses'],
});

export async function projectHashes(root) {
  return { renderHash: await renderHash(root), contentHash: await contentHash(root), toolingHash: await toolingHash(root) };
}

export async function readConfig(root) {
  const file = path.join(root, 'ras.config.json');
  const config = existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : {};
  for (const key of Object.keys(config)) {
    if (!(key in defaults)) throw new Error(`Unknown ras.config.json setting: ${key}`);
    if (booleanSettings.has(key)) { if (typeof config[key] !== 'boolean') throw new Error(`${key} must be true or false`); continue; }
    if (!Number.isFinite(config[key]) || config[key] <= 0) throw new Error(`${key} must be a positive number`);
  }
  return { ...defaults, ...config };
}

export async function compileDiagrams(source, root, dist) {
  const engine = new Marp({ html: true });
  const tokens = engine.markdown.parse(source, {});
  const diagrams = tokens.filter(token => token.type === 'fence' && token.info.trim() === 'mermaid');
  if (!diagrams.length) return source;
  const { renderMermaid } = await import('@mermaid-js/mermaid-cli');
  const executablePath = await browserPath();
  const scratch = path.join(root, '.ras', 'diagrams');
  const output = path.join(dist, 'assets', 'generated');
  await mkdir(scratch, { recursive: true });
  await mkdir(output, { recursive: true });
  const lines = source.split('\n');
  const browser = await puppeteer.launch({ executablePath });
  try {
    // Report failures by slide and by the diagram's position on that slide.
    const slideStarts = tokens.filter(token => token.type === 'marpit_slide_open').map(token => token.map[0]);
    const slideOf = token => slideStarts.filter(start => start <= token.map[0]).length || 1;
    const located = diagrams.map(token => {
      const slide = slideOf(token);
      return { token, slide, nth: diagrams.filter(other => slideOf(other) === slide && other.map[0] <= token.map[0]).length };
    });
    for (const { token, slide, nth } of [...located].reverse()) {
      try {
        const id = createHash('sha256').update(token.content).digest('hex').slice(0, 16);
        const input = path.join(scratch, `${id}.mmd`);
        await writeFile(input, token.content);
        const { fonts, css } = await diagramFonts(token.content);
        // The CLI loads document.fonts before measuring labels, but adds myCSS only
        // after rendering. Register fonts at document creation, then embed them in SVG.
        const fontBrowser = {
          async newPage() {
            const page = await browser.newPage();
            await page.evaluateOnNewDocument(faces => {
              for (const font of faces) document.fonts.add(new FontFace(font.family, font.source, { weight: font.weight, unicodeRange: font.unicodeRange }));
            }, fonts);
            return page;
          },
        };
        const diagram = await renderMermaid(fontBrowser, token.content, 'svg', {
          backgroundColor: 'transparent', myCSS: css,
          mermaidConfig: { theme: 'dark', securityLevel: 'strict', fontFamily: 'RAS Sans, RAS CJK, sans-serif', htmlLabels: false },
        });
        await writeFile(path.join(output, `${id}.svg`), diagram.data);
        lines.splice(token.map[0], token.map[1] - token.map[0], `![Workflow diagram](assets/generated/${id}.svg)`);
      } catch (error) {
        throw new Error(`Mermaid diagram ${nth} on slide ${slide} (source line ${token.map[0] + 1}) failed to compile: ${error.message}`, { cause: error });
      }
    }
  } finally { await browser.close(); }
  return lines.join('\n');
}
