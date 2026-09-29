import assert from 'node:assert/strict';
import { cp, lstat, mkdir, mkdtemp, readFile, readlink, writeFile, rm, symlink } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const before = await snapshotWorkspace();
const original = await readFile(path.join(root, 'scripts/deck.mjs'), 'utf8');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'ras-mutation-'));
// Match the intended assertion diagnostic, not just a nonzero exit from a crash.
const mutants = [
  {
    name: 'PDF page-count guard',
    remove: '  if (pages !== built.slides) throw new Error(`PDF has ${pages} pages; expected ${built.slides}`);\n',
    test: 'tests/export.test.mjs',
    failures: ['export rejects a truncated PDF before publishing verification.json'],
    assertion: /Missing expected rejection/,
  },
  {
    name: 'preview directory boundary',
    remove: '!file.startsWith(base + path.sep) || ',
    test: 'tests/preview.test.mjs',
    failures: ['/%2e%2e%2fslides.md returns 404', '/..%2fslides.md returns 404'],
    assertion: /200 !== 404/,
  },
];

async function snapshotWorkspace() {
  const entries = [];
  // Git's standard excludes cover .gitignore, .git/info/exclude, and global
  // ignore rules. Tracked files remain included even if an ignore rule matches.
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' });
  for (const file of [...new Set(files.split('\0').filter(Boolean))].sort()) {
    const absolute = path.join(root, file);
    let info;
    try { info = await lstat(absolute); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      entries.push({ path: file, missing: true });
      continue;
    }
    const entry = { path: file, mode: info.mode };
    if (info.isFile()) entry.sha256 = createHash('sha256').update(await readFile(absolute)).digest('hex');
    else if (info.isSymbolicLink()) entry.target = await readlink(absolute);
    entries.push(entry);
  }
  return entries;
}

function runTests(files) {
  // Match npm test: browser suites run one file at a time to avoid competing
  // Chrome launches on resource-constrained CI runners.
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', ...files], {
    cwd: temporary, encoding: 'utf8', timeout: 120_000, maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error) {
    // Preserve the child diagnostics when a timeout or spawn error interrupts TAP.
    console.error(result.stdout + result.stderr);
    throw result.error;
  }
  assert.equal(result.signal, null, `Test process terminated by ${result.signal}`);
  return { status: result.status, output: result.stdout + result.stderr };
}

const errors = [];
try {
  // Use the Git-aware snapshot so new initDeck inputs (guides, licences, etc.)
  // are included without maintaining a second list of required source paths.
  for (const entry of before) {
    if (entry.missing) continue;
    const destination = path.join(temporary, entry.path);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(root, entry.path), destination, { recursive: true });
  }
  await symlink(path.join(root, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
  console.log('Checking the unmodified export and preview tests in an isolated copy...');
  const baseline = runTests(mutants.map(mutant => mutant.test));
  assert.equal(baseline.status, 0, baseline.output);
  for (const mutant of mutants) {
    assert.equal(original.split(mutant.remove).length, 2, `Mutation target changed: ${mutant.name}`);
    await writeFile(path.join(temporary, 'scripts/deck.mjs'), original.replace(mutant.remove, ''));
    console.log(`Removing ${mutant.name} in the isolated copy...`);
    const result = runTests([mutant.test]);
    assert.equal(result.status, 1, `Mutation was not caught:\n${result.output}`);
    assert.match(result.output, mutant.assertion, `Wrong failure reason:\n${result.output}`);
    // TAP indents nested subtests. Require a named "not ok N - ..." result so
    // an unrelated failure cannot stand in for the guard's regression assertion.
    const failures = result.output.split('\n').filter(line => /^\s*not ok \d+ - /.test(line));
    for (const name of mutant.failures) {
      assert.ok(failures.some(line => line.endsWith(name)), `Expected assertion did not fail: ${name}\n${result.output}`);
    }
    console.log(`CAUGHT: ${mutant.name} — ${mutant.failures.join('; ')}`);
  }
  console.log('Both mutations were caught.');
} catch (error) { errors.push(error); }

// Attempt both finalizers even after a failure, preserving the original error
// alongside any cleanup or snapshot errors instead of replacing it in finally.
try { await rm(temporary, { recursive: true, force: true }); }
catch (error) { errors.push(error); }
try {
  assert.deepEqual(await snapshotWorkspace(), before, 'Mutation checks changed the workspace');
  console.log(`Workspace unchanged: ${before.filter(entry => entry.sha256).length} files checked (tracked and non-ignored untracked files).`);
} catch (error) { errors.push(error); }
if (errors.length === 1) throw errors[0];
if (errors.length > 1) throw new AggregateError(errors, 'Mutation checks or finalization failed');
