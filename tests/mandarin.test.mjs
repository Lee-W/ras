import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';
import { initDeck } from '../scripts/ras.mjs';
import { exportDeck } from '../scripts/deck.mjs';
import { browserPath } from '../scripts/project.mjs';

// Original generic content; no historical deck text or media enters the fixture.
export const mandarinSource = `---
marp: true
theme: ras
---
# 臺灣華語長標題也要在不同電腦上維持穩定的閱讀節奏

<p id="mandarin-body">先說清楚觀眾需要理解的問題，再用具體例子解釋解法。</p>

---

# 程式碼也要有清楚的華語註解

\`\`\`python
# 先確認輸入，再開始處理
def prepare(message):
    return message.strip()
\`\`\`

---

# 從需求到完成簡報

\`\`\`mermaid
flowchart LR
  A["收到需求"] --> B["查證來源"] --> C["完成簡報"]
\`\`\`
`;

async function fontsFor(page, selector) {
  const client = await page.createCDPSession();
  try {
    await client.send('DOM.enable');
    await client.send('CSS.enable');
    const { root } = await client.send('DOM.getDocument');
    const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    assert.ok(nodeId, `Missing font probe: ${selector}`);
    return (await client.send('CSS.getPlatformFontsForNode', { nodeId })).fonts.filter(font => font.glyphCount > 0);
  } finally { await client.detach(); }
}

test('Taiwanese Mandarin headings, prose, code comments, and Mermaid use local Noto fonts offline and export', async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ras-mandarin-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const root = await initDeck(path.join(temporary, 'talk'));
  await writeFile(path.join(root, 'slides.md'), mandarinSource);
  await exportDeck(root);
  const report = JSON.parse(await readFile(path.join(root, 'dist/verification.json'), 'utf8'));
  assert.equal(report.passed, true);
  assert.equal(report.pdfPages, 3);
  const browser = await puppeteer.launch({ executablePath: await browserPath(), headless: true });
  try {
    const page = await browser.newPage();
    await page.setOfflineMode(true);
    await page.goto(pathToFileURL(path.join(root, 'dist/index.html')).href, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    for (const selector of ['section h1', '#mandarin-body', '.hljs-comment']) {
      if (selector === '.hljs-comment') {
        await page.keyboard.press('ArrowRight');
        await page.waitForSelector('.bespoke-marp-active .hljs-comment', { visible: true });
        await page.evaluate(() => document.fonts.ready);
      }
      const fonts = await fontsFor(page, selector);
      assert.ok(fonts.some(font => /Noto Sans TC/.test(font.familyName) && font.isCustomFont), `${selector} must use the packaged Noto font: ${JSON.stringify(fonts)}`);
      assert.ok(fonts.every(font => font.isCustomFont), `${selector} fell back to a system font`);
    }
    const generated = path.join(root, 'dist/assets/generated');
    const svg = path.join(generated, (await readdir(generated)).find(file => file.endsWith('.svg')));
    assert.match(await readFile(svg, 'utf8'), /data:font\/woff2;base64,/);
    assert.doesNotMatch(await readFile(svg, 'utf8'), /<foreignObject/, 'Image-embedded diagrams need SVG text labels');
    await page.goto(pathToFileURL(svg).href, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    // CDP reports fonts for direct text children; Mermaid nests labels in tspans.
    const diagramFonts = await fontsFor(page, 'text tspan:not(:has(tspan)):not(:empty)');
    assert.ok(diagramFonts.some(font => /Noto Sans TC/.test(font.familyName) && font.isCustomFont), `Mermaid must retain its embedded Noto font: ${JSON.stringify(diagramFonts)}`);
    const outside = await page.evaluate(() => {
      const box = document.documentElement.getBoundingClientRect();
      return [...document.querySelectorAll('text')].filter(text => text.textContent.trim()).some(text => {
        const label = text.getBoundingClientRect();
        return label.left < box.left - 2 || label.top < box.top - 2 || label.right > box.right + 2 || label.bottom > box.bottom + 2;
      });
    });
    assert.equal(outside, false, 'Taiwanese Mandarin Mermaid labels must fit the diagram');
  } finally { await browser.close(); }
});
