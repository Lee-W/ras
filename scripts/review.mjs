import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { renderHash } from './hash.mjs';
import { runMain } from './cli.mjs';
import { readState, writeState } from './state.mjs';

const kinds = ['visual', 'factual'];
const digest = /^[a-f0-9]{64}$/;

export async function reviewContextHash(root, sourceHash = undefined) {
  const inputs = [['sourceHash', sourceHash ?? await renderHash(root)]];
  for (const file of ['brief.md', 'outline.md', 'sources.md']) {
    try { inputs.push([file, await readFile(path.join(root, file), 'utf8')]); }
    catch (error) { if (error.code !== 'ENOENT') throw error; inputs.push([file, null]); }
  }
  return createHash('sha256').update(JSON.stringify(inputs)).digest('hex');
}

function validateRecord(record) {
  assert.ok(record && kinds.includes(record.kind), 'Review kind must be visual or factual');
  for (const key of ['sourceHash', 'contextHash']) assert.match(record[key] ?? '', digest, `Review needs ${key}`);
  assert.ok(['passed', 'needs_changes'].includes(record.verdict), 'Review verdict must be passed or needs_changes');
  for (const key of ['reviewer', 'observations']) assert.ok(typeof record[key] === 'string' && record[key].trim(), `Review needs ${key}`);
  assert.ok(Array.isArray(record.pages) && record.pages.length && record.pages.every(page => Number.isSafeInteger(page) && page > 0), 'Review needs positive page numbers');
  assert.equal(new Set(record.pages).size, record.pages.length, 'Review pages must be unique');
}

// sourceHash is the render hash: kit tooling upgrades do not invalidate reviews.
// Callers that already hold it (a fresh build) pass it in to avoid rehashing.
export async function reviewState(root, sourceHash = undefined) {
  sourceHash ??= await renderHash(root);
  const contextHash = await reviewContextHash(root, sourceHash);
  const state = { sourceHash, contextHash, visualReview: 'pending', factualReview: 'pending' };
  let saved;
  try {
    saved = await readState(root, 'reviews.json');
    if (saved && (saved.schemaVersion !== 1 || !saved.records || typeof saved.records !== 'object' || Array.isArray(saved.records))) throw new Error('Invalid review state');
  } catch (error) {
    return { ...state, visualReview: 'invalid', factualReview: 'invalid', reviewError: error.message };
  }
  for (const kind of kinds) {
    const record = saved?.records[kind];
    if (!record) continue;
    try { validateRecord(record); assert.equal(record.kind, kind); }
    catch (error) { state[`${kind}Review`] = 'invalid'; state[`${kind}ReviewError`] = error.message; continue; }
    // Context changes invalidate both kinds: audience/venue changes affect visuals too.
    state[`${kind}Review`] = record.sourceHash !== sourceHash || record.contextHash !== contextHash ? 'stale' : record.verdict;
  }
  return state;
}

export async function status(root, sourceHash = undefined) {
  const state = await reviewState(root, sourceHash);
  let machine = 'pending';
  let slides = null;
  let machineError;
  try {
    const report = await readState(root, 'check.json');
    if (report) {
      assert.ok(digest.test(report.sourceHash) && Number.isSafeInteger(report.slides) && report.slides > 0 && typeof report.passed === 'boolean', 'Invalid machine report');
      machine = report.sourceHash === state.sourceHash ? (report.passed ? 'passed' : 'failed') : 'stale';
      if (machine !== 'stale') slides = report.slides;
    }
  } catch (error) { machine = 'invalid'; machineError = error.message; }
  return { ...state, machine, ...(machineError ? { machineError } : {}), slides, ready: machine === 'passed' && state.visualReview === 'passed' && state.factualReview === 'passed' };
}

export async function recordReview(root, candidate) {
  validateRecord(candidate);
  const current = await status(root);
  assert.equal(candidate.sourceHash, current.sourceHash, 'Source changed since review; inspect the current deck');
  assert.equal(candidate.contextHash, current.contextHash, 'Brief, outline, or sources changed since review');
  assert.ok(['passed', 'failed'].includes(current.machine), 'Run npm run check on the current source before recording a review');
  assert.ok(candidate.pages.every(page => page <= current.slides), 'Review page is outside the current deck');
  if (candidate.verdict === 'passed') assert.equal(candidate.pages.length, current.slides, 'A passing review must cover every current page');
  const saved = await readState(root, 'reviews.json') ?? { schemaVersion: 1, records: {} };
  assert.ok(saved.schemaVersion === 1 && saved.records && typeof saved.records === 'object' && !Array.isArray(saved.records), 'Invalid review state');
  const { kind, sourceHash, contextHash, verdict, reviewer, observations, pages } = candidate;
  saved.records[kind] = { kind, sourceHash, contextHash, verdict, reviewer, observations, pages: [...pages].sort((a, b) => a - b), recordedAt: new Date().toISOString() };
  await writeState(root, 'reviews.json', saved);
  return status(root);
}

await runMain(import.meta.url, 'review', async ([command, file, ...extra]) => {
  if (command === 'status' && !file) console.log(JSON.stringify(await status(process.cwd()), null, 2));
  else if (command === 'record' && file && !extra.length) console.log(JSON.stringify(await recordReview(process.cwd(), JSON.parse(await readFile(file, 'utf8'))), null, 2));
  else throw new Error('Usage: node scripts/review.mjs status | record <review.json>');
});
