import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
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
