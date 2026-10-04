import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { exportDeck, preview } from '../scripts/deck.mjs';
import { initDeck } from '../scripts/ras.mjs';
import { recordReview, status } from '../scripts/review.mjs';

async function makeDeck(t) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ras-export-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const deck = await initDeck(path.join(temporary, 'talk'));
  await writeFile(path.join(deck, 'slides.md'), '---\nmarp: true\ntheme: ras\n---\n# First beat\n\n---\n\n# Second beat\n');
  return deck;
}

test('export records the actual PDF page count in verification.json', async t => {
  const deck = await makeDeck(t);
  await exportDeck(deck);
  const report = JSON.parse(await readFile(path.join(deck, 'dist/verification.json'), 'utf8'));
  const pdf = await PDFDocument.load(await readFile(path.join(deck, 'dist/slides.pdf')));
  assert.equal(report.passed, true);
  assert.equal(report.slides, 2);
  assert.equal(report.pdfPages, report.slides);
  assert.equal(report.pdfPages, pdf.getPageCount());
  assert.equal(report.visualReview, 'pending');
  const evidence = ['dist/slides.pdf', 'dist/verification.json', '.ras/check.json'];
  const beforePreview = await Promise.all(evidence.map(file => readFile(path.join(deck, file))));
  const server = await preview(deck, 0);
  try {
    for (const [index, file] of evidence.entries()) {
      assert.deepEqual(await readFile(path.join(deck, file)), beforePreview[index], `Preview must preserve current ${file}`);
    }
    const response = await fetch(`http://127.0.0.1:${server.address().port}/slides.pdf`);
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), beforePreview[0]);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
  for (const notice of ['licenses/README.md', 'licenses/ras/MIT.txt', 'licenses/ras/NOTICE.md']) {
    assert.deepEqual(await readFile(path.join(deck, 'dist', notice)), await readFile(path.join(deck, notice)), 'Export must retain RAS notices byte-for-byte');
  }
  const snapshot = await status(deck);
  for (const kind of ['visual', 'factual']) await recordReview(deck, {
    kind, sourceHash: snapshot.sourceHash, contextHash: snapshot.contextHash,
    verdict: 'passed', reviewer: 'Export integration fixture', pages: [1, 2],
    observations: 'Synthetic attestation to test persistence through export; not a human review.',
  });
  await exportDeck(deck);
  const reviewed = JSON.parse(await readFile(path.join(deck, 'dist/verification.json'), 'utf8'));
  assert.equal(reviewed.visualReview, 'passed');
  assert.equal(reviewed.factualReview, 'passed');
  await writeFile(path.join(deck, 'sources.md'), 'Updated evidence requires a fresh review.');
  await exportDeck(deck);
  const stale = JSON.parse(await readFile(path.join(deck, 'dist/verification.json'), 'utf8'));
  assert.equal(stale.visualReview, 'stale');
  assert.equal(stale.factualReview, 'stale');
});

test('export rejects a truncated PDF before publishing verification.json', async t => {
  const deck = await makeDeck(t);
  const loadPdf = PDFDocument.load.bind(PDFDocument);
  // Simulate a renderer producing a valid PDF with a missing page at the read
  // boundary. Keep real PDF bytes/parsing; leave export's count check untouched.
  t.mock.method(PDFDocument, 'load', async bytes => {
    const pdf = await loadPdf(bytes);
    pdf.removePage(pdf.getPageCount() - 1);
    const truncated = await pdf.save();
    await writeFile(path.join(deck, 'dist/slides.pdf'), truncated);
    return loadPdf(truncated);
  });
  await assert.rejects(exportDeck(deck), /PDF has 1 pages; expected 2/);
  const actual = await loadPdf(await readFile(path.join(deck, 'dist/slides.pdf')));
  assert.equal(actual.getPageCount(), 1);
  await assert.rejects(access(path.join(deck, 'dist/verification.json')), { code: 'ENOENT' });
});
