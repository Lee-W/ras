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

async function makeFailingDeck(t, allow) {
  const deck = await makeDeck(t);
  // A 10px paragraph sits below the 24px body-text threshold, so check must fail.
  await writeFile(path.join(deck, 'slides.md'), '---\nmarp: true\ntheme: ras\n---\n# First beat\n\n<p style="font-size:10px">Too small to read</p>\n');
  if (allow !== undefined) await writeFile(path.join(deck, 'ras.config.json'), JSON.stringify({ allowExportOnCheckFailure: allow }));
  return deck;
}

test('export stops without a PDF when the check fails and allowExportOnCheckFailure is false or unset', async t => {
  for (const allow of [undefined, false]) {
    const deck = await makeFailingDeck(t, allow);
    await assert.rejects(exportDeck(deck), /Verification failed/);
    assert.equal(JSON.parse(await readFile(path.join(deck, '.ras/check.json'), 'utf8')).passed, false);
    await assert.rejects(access(path.join(deck, 'dist/slides.pdf')), { code: 'ENOENT' });
    await assert.rejects(access(path.join(deck, 'dist/verification.json')), { code: 'ENOENT' });
  }
});

test('allowExportOnCheckFailure exports the PDF but keeps the failure signal', async t => {
  const deck = await makeFailingDeck(t, true);
  const previousExitCode = process.exitCode;
  const warnings = [];
  t.mock.method(console, 'warn', message => warnings.push(message));
  t.mock.method(console, 'error', () => {});
  t.after(() => { process.exitCode = previousExitCode; });
  process.exitCode = undefined;
  await exportDeck(deck);
  assert.equal(process.exitCode, 1);
  assert.match(warnings.join('\n'), /WARNING: exported despite \d+ failed check problem.*\.ras\/check\.json/);
  assert.equal(JSON.parse(await readFile(path.join(deck, '.ras/check.json'), 'utf8')).passed, false);
  const report = JSON.parse(await readFile(path.join(deck, 'dist/verification.json'), 'utf8'));
  assert.equal(report.passed, false);
  assert.equal(report.pdfPages, report.slides);
  assert.ok((await readFile(path.join(deck, 'dist/slides.pdf'))).length > 0);
  const current = await status(deck);
  assert.equal(current.machine, 'failed');
  assert.equal(current.ready, false);
});
