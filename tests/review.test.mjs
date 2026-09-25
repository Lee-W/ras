import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { recordReview, status } from '../scripts/review.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ras-review-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'slides.md'), '# Original review exercise\n');
  await mkdir(path.join(root, '.ras'));
  const current = await status(root);
  await writeFile(path.join(root, '.ras/check.json'), JSON.stringify({ sourceHash: current.sourceHash, slides: 2, passed: true }));
  const candidate = kind => ({ kind, sourceHash: current.sourceHash, contextHash: current.contextHash, verdict: 'passed', reviewer: 'Test fixture', pages: [1, 2], observations: 'Original fixture observations for both pages.' });
  return { root, candidate };
}

test('review status separates machine checks from recorded visual and factual reviews', async t => {
  const { root, candidate } = await fixture(t);
  assert.equal((await status(root)).visualReview, 'pending');
  assert.equal((await status(root)).ready, false);
  const visual = await recordReview(root, candidate('visual'));
  assert.equal(visual.visualReview, 'passed');
  assert.equal(visual.factualReview, 'pending');
  assert.equal(visual.ready, false);
  assert.equal((await recordReview(root, candidate('factual'))).ready, true);
  assert.equal((await recordReview(root, { ...candidate('factual'), verdict: 'needs_changes', pages: [2] })).ready, false);
  assert.equal((await status(root)).factualReview, 'needs_changes');
  const cli = JSON.parse(execFileSync(process.execPath, [new URL('../scripts/review.mjs', import.meta.url).pathname, 'status'], { cwd: root, encoding: 'utf8' }));
  assert.equal(cli.factualReview, 'needs_changes');
});

test('brief, outline, and source ledger edits and deletions invalidate review but preserve machine evidence', async t => {
  for (const file of ['brief.md', 'outline.md', 'sources.md']) await t.test(file, async t => {
    const { root, candidate } = await fixture(t);
    await recordReview(root, candidate('visual'));
    await recordReview(root, candidate('factual'));
    await writeFile(path.join(root, file), '# New review context\n');
    let current = await status(root);
    assert.equal(current.machine, 'passed');
    assert.equal(current.visualReview, 'stale');
    assert.equal(current.factualReview, 'stale');
    await assert.rejects(recordReview(root, candidate('factual')), /changed since review/);
    for (const kind of ['visual', 'factual']) await recordReview(root, { ...candidate(kind), contextHash: current.contextHash });
    await rm(path.join(root, file));
    current = await status(root);
    assert.equal(current.factualReview, 'stale');
    assert.equal(current.visualReview, 'stale');
    assert.equal(current.machine, 'passed');
  });
});

test('slide edits stale all evidence and review records survive rebuild-style check replacement', async t => {
  const { root, candidate } = await fixture(t);
  await recordReview(root, candidate('visual'));
  const before = await readFile(path.join(root, '.ras/reviews.json'), 'utf8');
  await rm(path.join(root, '.ras/check.json'));
  assert.equal((await status(root)).visualReview, 'passed');
  assert.equal((await status(root)).machine, 'pending');
  await writeFile(path.join(root, 'slides.md'), '# Revised story\n');
  await writeFile(path.join(root, '.ras/check.json'), JSON.stringify({ sourceHash: candidate('visual').sourceHash, slides: 2, passed: true }));
  const current = await status(root);
  assert.equal(current.machine, 'stale');
  assert.equal(current.visualReview, 'stale');
  assert.equal(await readFile(path.join(root, '.ras/reviews.json'), 'utf8'), before);
  await assert.rejects(recordReview(root, candidate('visual')), /Source changed/);
});

test('recording rejects incomplete coverage, missing observations, and malformed state', async t => {
  const { root, candidate } = await fixture(t);
  for (const pages of [[1], [1, 1], [1, 3], [0, 1], []]) {
    await assert.rejects(recordReview(root, { ...candidate('visual'), pages }));
  }
  await assert.rejects(recordReview(root, { ...candidate('visual'), observations: '' }), /observations/);
  await writeFile(path.join(root, '.ras/reviews.json'), '{');
  assert.equal((await status(root)).visualReview, 'invalid');
  await assert.rejects(recordReview(root, candidate('visual')), SyntaxError);
  assert.equal(await readFile(path.join(root, '.ras/reviews.json'), 'utf8'), '{');
  await writeFile(path.join(root, '.ras/reviews.json'), 'null');
  assert.equal((await status(root)).visualReview, 'invalid');
  await assert.rejects(recordReview(root, candidate('visual')), /Invalid project state/);
  assert.equal(await readFile(path.join(root, '.ras/reviews.json'), 'utf8'), 'null');
  await writeFile(path.join(root, '.ras/check.json'), '{}');
  assert.equal((await status(root)).machine, 'invalid');
});
