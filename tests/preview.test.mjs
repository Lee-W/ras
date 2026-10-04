import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, access } from 'node:fs/promises';
import { request } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { preview } from '../scripts/deck.mjs';
import { initDeck } from '../scripts/ras.mjs';

function get(port, rawPath) {
  return new Promise((resolve, reject) => {
    // Use a raw request target: URL/fetch normalization would hide traversal.
    const req = request({ host: '127.0.0.1', port, path: rawPath }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString() }));
      response.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

test('preview serves index.html and blocks encoded traversal outside dist', async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ras-preview-'));
  const deck = await initDeck(path.join(temporary, 'talk'));
  await writeFile(path.join(deck, 'slides.md'), '---\nmarp: true\ntheme: ras\n---\n# Preview test\n');
  const server = await preview(deck, 0);
  t.after(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(temporary, { recursive: true, force: true });
  });
  const port = server.address().port;
  await t.test('/index.html returns 200', async () => {
    const response = await get(port, '/index.html');
    assert.equal(response.status, 200);
    assert.match(response.body, /Preview test/);
  });
  for (const rawPath of ['/%2e%2e%2fslides.md', '/..%2fslides.md']) {
    await t.test(`${rawPath} returns 404`, async () => {
      const response = await get(port, rawPath);
      assert.equal(response.status, 404);
      assert.doesNotMatch(response.body, /Preview test/);
    });
  }
});

test('preview rebuilds changed source and missing or malformed output', async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ras-preview-freshness-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const deck = await initDeck(path.join(temporary, 'talk'));
  const slides = title => `---\nmarp: true\ntheme: ras\n---\n# ${title}\n`;
  await writeFile(path.join(deck, 'slides.md'), slides('Initial preview'));
  async function inspect(title) {
    const server = await preview(deck, 0);
    try {
      const response = await get(server.address().port, '/index.html');
      assert.equal(response.status, 200);
      assert.ok(response.body.includes(title));
    } finally {
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  }
  await inspect('Initial preview');
  const first = await readFile(path.join(deck, 'dist/build.json'), 'utf8');
  await writeFile(path.join(deck, 'dist/slides.pdf'), 'stale PDF fixture');
  await writeFile(path.join(deck, 'slides.md'), slides('Changed preview'));
  await inspect('Changed preview');
  assert.notEqual(await readFile(path.join(deck, 'dist/build.json'), 'utf8'), first);
  await assert.rejects(access(path.join(deck, 'dist/slides.pdf')), { code: 'ENOENT' });
  await rm(path.join(deck, 'dist/index.html'));
  await inspect('Changed preview');
  for (const manifest of ['invalid JSON', 'null']) {
    await writeFile(path.join(deck, 'dist/build.json'), manifest);
    await inspect('Changed preview');
    const rebuilt = JSON.parse(await readFile(path.join(deck, 'dist/build.json'), 'utf8'));
    assert.equal(typeof rebuilt.sourceHash, 'string');
  }
});
