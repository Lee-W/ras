#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile, stat, realpath, rm } from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { browserPath, marp, render, projectHash, readConfig, prepareFonts, compileDiagrams } from './project.mjs';
import { probeSlide } from './probe.mjs';
import { reviewState } from './review.mjs';

export async function build(root = process.cwd()) {
  root = path.resolve(root);
  const dist = path.join(root, 'dist');
  // Output is disposable: removed source assets must not survive a fresh build.
  await rm(dist, { recursive: true, force: true });
  await rm(path.join(root, '.ras', 'check.json'), { force: true });
  await mkdir(dist, { recursive: true });
  await mkdir(path.join(root, '.ras'), { recursive: true });
  const original = await readFile(path.join(root, 'slides.md'), 'utf8');
  const themeSource = await readFile(path.join(root, 'theme.css'), 'utf8');
  const sourceHash = await projectHash(root);
  if (existsSync(path.join(root, 'assets'))) await cp(path.join(root, 'assets'), path.join(dist, 'assets'), { recursive: true });
  const theme = themeSource + '\n' + await prepareFonts(dist);
  const source = await compileDiagrams(original, root, dist);
  const result = render(source, theme);
  if (!result.count) throw new Error('The source contains no slides');
  await writeFile(path.join(dist, 'slides.md'), source);
  await writeFile(path.join(dist, 'theme.css'), theme);
  await marp(['slides.md', '--no-config', '--html', '--theme-set', 'theme.css', '--output', 'index.html'], dist);
  const notes = result.comments.map((comments, index) => `Slide ${index + 1}\n${comments.join('\n\n')}`).join('\n\n---\n\n');
  await writeFile(path.join(dist, 'notes.txt'), notes + '\n');
  const manifest = { sourceHash, slides: result.count, builtAt: new Date().toISOString() };
  await writeFile(path.join(dist, 'build.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Built ${result.count} slides → dist/index.html`);
  return { ...manifest, root, dist, source, theme, result };
}

export async function check(root = process.cwd()) {
  const built = await build(root);
  const config = await readConfig(built.root);
  const previews = path.join(built.root, '.ras', 'previews');
  await rm(previews, { recursive: true, force: true });
  await mkdir(previews, { recursive: true });
  const report = { sourceHash: built.sourceHash, slides: built.slides, checkedAt: new Date().toISOString(), passed: false, problems: [], pages: [] };
  const browser = await puppeteer.launch({ executablePath: await browserPath(), headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    const requests = new Set();
    page.on('request', request => {
      const url = request.url();
      if (/^https?:/i.test(url)) { requests.add(url); void request.abort(); }
      else void request.continue();
    });
    page.on('pageerror', error => report.problems.push(`Browser error: ${error.message}`));
    page.on('requestfailed', request => {
      if (!/^https?:/i.test(request.url())) report.problems.push(`Resource failed: ${request.url()}`);
    });
    // Inspect the real output as well as the unscaled page probes below.
    await page.goto(pathToFileURL(path.join(built.dist, 'index.html')).href, { waitUntil: 'networkidle0' });
    const htmlCount = await page.$$eval('svg[data-marpit-svg] section', sections => sections.length);
    if (htmlCount !== built.slides) report.problems.push(`HTML has ${htmlCount} slides; source has ${built.slides}`);
    for (let index = 0; index < built.slides; index++) {
      const html = `<!doctype html><html><head><meta charset="utf-8"><base href="${pathToFileURL(built.dist + path.sep).href}"><style>${built.result.css}\nhtml,body{margin:0;padding:0;background:#111}section{margin:0!important}</style></head><body><div class="marpit">${built.result.html[index]}</div></body></html>`;
      const probeFile = path.join(built.root, '.ras', 'probe.html');
      await writeFile(probeFile, html);
      await page.goto(pathToFileURL(probeFile).href, { waitUntil: 'load' });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
      });
      const findings = await page.evaluate(probeSlide, config);
      const section = await page.$('section');
      const filename = `slide-${String(index + 1).padStart(3, '0')}.png`;
      await section.screenshot({ path: path.join(previews, filename) });
      report.pages.push({ page: index + 1, ...findings, preview: `.ras/previews/${filename}` });
    }
    for (const url of requests) report.problems.push(`Remote presentation resource: ${url}`);
  } finally { await browser.close(); }
  if (await projectHash(built.root) !== built.sourceHash) report.problems.push('Source changed during verification; run check again');
  report.passed = !report.problems.length && report.pages.every(page => !page.problems.length);
  const reviews = await reviewState(built.root);
  Object.assign(report, { contextHash: reviews.contextHash, visualReview: reviews.visualReview, factualReview: reviews.factualReview });
  await writeFile(path.join(built.root, '.ras', 'check.json'), JSON.stringify(report, null, 2) + '\n');
  for (const problem of report.problems) console.error(problem);
  for (const page of report.pages) for (const problem of page.problems) console.error(`Slide ${page.page}: ${problem}`);
  if (!report.passed) throw new Error('Verification failed. See .ras/check.json');
  console.log(`Checked ${report.slides} slides. Visual and factual review remain separate.`);
  return { built, report };
}

export async function exportDeck(root = process.cwd()) {
  const { built, report } = await check(root);
  await marp(['slides.md', '--no-config', '--html', '--theme-set', 'theme.css', '--allow-local-files', '--browser-path', await browserPath(), '--pdf', '--output', 'slides.pdf'], built.dist);
  const pdf = await PDFDocument.load(await readFile(path.join(built.dist, 'slides.pdf')));
  const pages = pdf.getPageCount();
  if (pages !== built.slides) throw new Error(`PDF has ${pages} pages; expected ${built.slides}`);
  if (await projectHash(built.root) !== built.sourceHash) throw new Error('Source changed during export; export again');
  await writeFile(path.join(built.dist, 'verification.json'), JSON.stringify({ ...report, ...await reviewState(built.root), pdfPages: pages }, null, 2) + '\n');
  console.log(`Exported ${pages} PDF pages → dist/slides.pdf`);
}

export async function preview(root = process.cwd(), port = 4173) {
  const built = await build(root);
  const base = await realpath(built.dist);
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json' };
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = await realpath(path.join(base, pathname === '/' ? 'index.html' : pathname));
      if (!file.startsWith(base + path.sep) || !(await stat(file)).isFile()) throw new Error('Not found');
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      createReadStream(file).pipe(response);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  console.log(`Preview: http://127.0.0.1:${server.address().port} — rebuild after edits; Ctrl+C stops.`);
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const mode = process.argv[2];
    if (mode === 'build') await build();
    else if (mode === 'check') await check();
    else if (mode === 'export') await exportDeck();
    else if (mode === 'preview') await preview(process.cwd(), Number(process.env.PORT || 4173));
    else if (mode === 'doctor') { console.log(`Node ${process.version}\nBrowser: ${await browserPath()}\nProject: ${process.cwd()}`); await readConfig(process.cwd()); }
    else throw new Error('Usage: node scripts/deck.mjs build|check|export|preview|doctor');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
