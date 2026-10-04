import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { Marp } from '@marp-team/marp-core';
import puppeteer from 'puppeteer';
import { diagramFonts } from './fonts.mjs';
export { prepareFonts } from './fonts.mjs';

const require = createRequire(import.meta.url);
export const defaults = { minTextSize: 24, minCodeSize: 18, minCreditSize: 14 };

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
  await run(process.execPath, [require.resolve('@marp-team/marp-cli/marp-cli.js'), '--no-stdin', ...args], { cwd });
}

export function render(markdown, theme) {
  const engine = new Marp({ html: true });
  engine.themeSet.add(theme);
  const result = engine.render(markdown, { htmlAsArray: true });
  return { ...result, count: result.html.length };
}

export async function projectHash(root) {
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
  for (const file of ['slides.md', 'theme.css', 'ras.config.json', 'package.json', 'package-lock.json', 'justfile', 'RAS-LICENSE', 'RAS-NOTICE.md']) {
    if (existsSync(path.join(root, file))) { hash.update(file); hash.update(await readFile(path.join(root, file))); }
  }
  await add('assets');
  await add('scripts');
  await add('licenses');
  return hash.digest('hex');
}

export async function readConfig(root) {
  const file = path.join(root, 'ras.config.json');
  const config = existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : {};
  for (const key of Object.keys(config)) {
    if (!(key in defaults)) throw new Error(`Unknown ras.config.json setting: ${key}`);
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
    for (const token of [...diagrams].reverse()) {
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
    }
  } finally { await browser.close(); }
  return lines.join('\n');
}
