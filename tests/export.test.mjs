import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { exportDeck } from '../scripts/deck.mjs';
import { initDeck } from '../scripts/ras.mjs';

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
