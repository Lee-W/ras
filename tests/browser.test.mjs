import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';
import { browserPath, defaults } from '../scripts/project.mjs';
import { probeSlide } from '../scripts/probe.mjs';
import { build, check } from '../scripts/deck.mjs';
import { initDeck } from '../scripts/ras.mjs';

let browser;
before(async () => { browser = await puppeteer.launch({ executablePath: await browserPath(), headless: true }); });
after(async () => { await browser?.close(); });

test('layout probe catches overflow, clipping, tiny text, and missing assets', async () => {
  const page = await browser.newPage();
  try {
    await page.setContent('<style>section{width:1280px;height:720px;font:30px sans-serif}p{margin:0}</style><section><h1>A clean slide</h1><p>Readable sentence.</p></section>');
    assert.deepEqual((await page.evaluate(probeSlide, defaults)).problems, []);
    await page.setContent('<style>section{width:1280px;height:720px;font:30px sans-serif}.overflow{white-space:nowrap}.clip{height:10px;overflow:hidden}.tiny{font-size:10px}</style><section><p class="overflow">' + 'long unbroken sentence '.repeat(30) + '</p><p class="clip">Clipped explanation</p><p class="tiny">Tiny detail</p><img src="data:image/png;base64,broken" alt="Missing chart"></section>');
    const findings = (await page.evaluate(probeSlide, defaults)).problems.join('\n');
    assert.match(findings, /Text leaves slide/);
    assert.match(findings, /Clipped text/);
    assert.match(findings, /Small text/);
    assert.match(findings, /Missing image/);
  } finally { await page.close(); }
});

test('fresh builds remove stale output and checks reject missing or remote resources', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ras-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const deck = await initDeck(path.join(root, 'talk'));
  const source = '---\nmarp: true\ntheme: ras\n---\n# Source integrity\n\n';
  await writeFile(path.join(deck, 'slides.md'), source + '<!-- First rehearsal cue. -->\n\n---\n\n# Second beat\n\n<!-- Second rehearsal cue. -->');
  await mkdir(path.join(deck, 'dist'), { recursive: true });
  await mkdir(path.join(deck, '.ras'), { recursive: true });
  await writeFile(path.join(deck, 'dist/stale.png'), 'old asset');
  await writeFile(path.join(deck, '.ras/check.json'), '{"passed":true}');
  const built = await build(deck);
  const playback = await browser.newPage();
  try {
    const url = pathToFileURL(path.join(built.dist, 'index.html')).href;
    await playback.goto(url, { waitUntil: 'networkidle0' });
    await playback.keyboard.press('ArrowRight');
    await playback.waitForFunction(() => location.hash === '#2');
    assert.match(await playback.$eval('.bespoke-marp-active', el => el.textContent), /Second beat/);
    await playback.goto(url + '?view=presenter#2', { waitUntil: 'networkidle0' });
    const note = await playback.waitForSelector('.bespoke-marp-presenter-note-wrapper', { visible: true });
    assert.match(await note.evaluate(el => el.innerText), /Second rehearsal cue/);
  } finally { await playback.close(); }
  await assert.rejects(access(path.join(deck, 'dist/stale.png')));
  await assert.rejects(access(path.join(deck, '.ras/check.json')));
  await writeFile(path.join(deck, 'slides.md'), source + '![Local chart](assets/missing.png)\n![Remote chart](https://example.invalid/chart.png)');
  await assert.rejects(check(deck), /Verification failed/);
  const report = JSON.parse(await readFile(path.join(deck, '.ras/check.json'), 'utf8'));
  assert.equal(report.passed, false);
  assert.ok(report.problems.some(problem => problem.startsWith('Remote presentation resource:')));
  assert.ok(report.pages[0].problems.some(problem => problem.includes('Missing image')));
});
