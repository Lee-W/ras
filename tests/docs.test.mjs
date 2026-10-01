import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import puppeteer from 'puppeteer';
import { serveDocs } from '../scripts/docs.mjs';
import { pages, locales, pageUrl } from '../scripts/docs-pages.mjs';
import { browserPath } from '../scripts/project.mjs';

async function start(t) {
  const server = await serveDocs({ port: 0 });
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  return server.address().port;
}

function get(port, rawPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: rawPath, method }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString() }));
      response.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

test('documentation pairs every page across locales and rewrites source links', async t => {
  const port = await start(t);
  for (const [locale, copy] of Object.entries(locales)) {
    for (const page of pages) {
      const response = await get(port, pageUrl(locale, page.slug));
      assert.equal(response.status, 200);
      assert.ok(response.body.includes(`<html lang="${locale}">`));
      assert.ok(response.body.includes(`<title>${page[locale][0]} · RAS ${copy.docs}</title>`));
      const languages = response.body.match(/<nav class="languages"[^>]*>(.*?)<\/nav>/s)[1];
      for (const targetLocale of Object.keys(locales)) {
        assert.ok(languages.includes(`href="${pageUrl(targetLocale, page.slug)}"`), 'Switch languages on the same page');
      }
      const navigation = response.body.match(/<aside class="sidebar">(.*?)<\/aside>/s)[1];
      const links = [...navigation.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
      assert.deepEqual(links, pages.map(item => pageUrl(locale, item.slug)), 'Sidebar stays in the chosen language');
      assert.ok(navigation.includes(copy.guide));
      assert.ok(navigation.includes(copy.maintenance));
      assert.ok(navigation.includes(`href="${pageUrl(locale, page.slug)}" aria-current="page"`));
      assert.match(response.body, /name="ras-source-hash" content="[a-f0-9]{64}"/);
      const content = response.body.match(/<article[^>]*>(.*?)<\/article>/s)[1];
      for (const [, href] of content.matchAll(/href="([^"]+)"/g)) {
        if (href.startsWith('#') || /^[a-z]+:|^\/\//i.test(href)) continue;
        assert.ok(href.startsWith(`/${locale}/`) || /^\/(en|zh-TW)\//.test(href), `Unresolved source link: ${href}`);
        assert.equal((await get(port, href.split('#')[0])).status, 200, `${locale}/${page.slug}: ${href}`);
      }
    }
  }
  const workflow = await get(port, '/zh-TW/workflow');
  assert.match(workflow.body, /href="\/zh-TW\/memory"/);
  const original = await get(port, '/zh-TW/validation');
  assert.match(original.body, /href="\/en\/validation"/);
  const shared = await get(port, '/zh-TW/source/agents/chu2.md');
  assert.match(shared.body, /這份共用規格目前以英文維護/);
  assert.match(shared.body, /<article lang="en">/);
  const operation = await get(port, '/zh-TW/source/skills/outline/SKILL.md');
  assert.doesNotMatch(operation.body, /這份共用規格目前以英文維護/);
  assert.match(operation.body, /<article lang="zh-TW">/);
  assert.match((await get(port, '/zh-TW/source/skills/command-router/SKILL.md')).body, /這份共用規格目前以英文維護/);
});

test('documentation redirects old URLs and limits served files and methods', async t => {
  const port = await start(t);
  for (const [url, target] of [['/', '/zh-TW/'], ['/en', '/en/'], ['/README.md', '/en/'], ['/docs/review-zh-tw.md', '/zh-TW/review']]) {
    const response = await get(port, url);
    assert.equal(response.status, 302);
    assert.equal(response.headers.location, target);
  }
  for (const url of ['/package.json', '/.ras/memory.json', '/en/missing', '/fr/workflow', '/en/source/package.json', '/%2e%2e%2fpackage.json', '/_mermaid/%2e%2e/package.json', '/_mermaid/%5c..%5cpackage.json', '/_mermaid/%00.mjs', '/%zz']) {
    assert.equal((await get(port, url)).status, 404, url);
  }
  const module = await get(port, '/_mermaid/mermaid.esm.min.mjs');
  assert.equal(module.status, 200);
  assert.match(module.headers['content-type'], /javascript/);
  const head = await get(port, '/en/', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  assert.equal((await get(port, '/en/', 'POST')).status, 405);
});

test('documentation language switching, Mermaid and mobile navigation work in the browser', async t => {
  const port = await start(t);
  const browser = await puppeteer.launch({ executablePath: await browserPath(), headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 1360, height: 900 });
  await page.goto(`http://127.0.0.1:${port}/zh-TW/workflow`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.mermaid[data-processed="true"] svg');
  assert.equal(await page.$eval('.sidebar nav', node => node.getBoundingClientRect().height > 0), true);
  await Promise.all([page.waitForNavigation(), page.click('.languages a[lang="en"]')]);
  assert.ok(page.url().endsWith('/en/workflow'));
  assert.equal(await page.$eval('html', node => node.lang), 'en');
  assert.equal(await page.$eval('.sidebar a[aria-current]', node => node.textContent), 'Workflow');
  await Promise.all([page.waitForNavigation(), page.click('.sidebar a[href="/en/review"]')]);
  await Promise.all([page.waitForNavigation(), page.click('.languages a[lang="zh-TW"]')]);
  assert.ok(page.url().endsWith('/zh-TW/review'));
  await page.waitForSelector('.mermaid[data-processed="true"] svg');
  await page.click('.outline a');
  assert.ok(new URL(page.url()).hash.length > 1, 'The section outline is navigable');
  await page.setViewport({ width: 390, height: 844 });
  await page.waitForFunction(() => !document.querySelector('.sidebar details').open);
  await page.click('.sidebar summary');
  assert.equal(await page.$eval('.sidebar details', node => node.open), true);
  await Promise.all([page.waitForNavigation(), page.click('.sidebar a[href="/zh-TW/marp"]')]);
  assert.equal(await page.$eval('h1', node => node.textContent), 'Marp 撰寫指南');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
});
