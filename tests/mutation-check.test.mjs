import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

async function runFailingBaseline(t, changedFiles) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ras-mutation-harness-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const directory of ['scripts', 'tests', 'templates', 'node_modules', 'ignored', 'local-cache']) {
    await mkdir(path.join(root, directory));
  }
  await cp(new URL('../scripts/mutation-check.mjs', import.meta.url), path.join(root, 'scripts/mutation-check.mjs'));
  await writeFile(path.join(root, 'scripts/deck.mjs'), '// Harness fixture: the baseline intentionally fails before mutation.\n');
  await writeFile(path.join(root, 'package.json'), '{"type":"module"}\n');
  await writeFile(path.join(root, 'package-lock.json'), '{}\n');
  await writeFile(path.join(root, '.gitignore'), 'node_modules/\nignored/\n');
  await writeFile(path.join(root, 'tracked.md'), 'Before the baseline.\n');
  execFileSync('git', ['init', '--quiet'], { cwd: root });
  execFileSync('git', ['add', '-f', 'tracked.md'], { cwd: root });
  await writeFile(path.join(root, '.git/info/exclude'), 'local-cache/\n');

  // Exercise the real CLI's failure/finalization path without starting a browser.
  // The child changes this fixture workspace, then fails with a distinct message.
  await writeFile(path.join(root, 'tests/export.test.mjs'), `
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
test('controlled baseline failure', async () => {
  for (const file of ${JSON.stringify(changedFiles.map(file => path.join(root, file)))}) {
    await writeFile(file, 'Changed during baseline.');
  }
  assert.fail('Original baseline failure must survive');
});
`);
  await writeFile(path.join(root, 'tests/preview.test.mjs'), "import test from 'node:test';\ntest('fixture preview', () => {});\n");
  // Launch this standalone CLI outside the parent test runner's child protocol.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['scripts/mutation-check.mjs'], {
    cwd: root, env, encoding: 'utf8', timeout: 30_000, maxBuffer: 1024 * 1024,
  });
  if (result.error) throw result.error;
  assert.equal(result.signal, null);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  return result.stdout + result.stderr;
}

test('mutation snapshots ignore changes excluded by Git ignore rules', async t => {
  const output = await runFailingBaseline(t, ['ignored/activity.log', 'local-cache/session.json']);
  assert.match(output, /Original baseline failure must survive/);
  assert.match(output, /Workspace unchanged:/);
  assert.doesNotMatch(output, /Mutation checks changed the workspace|AggregateError/);
});

for (const file of ['tracked.md', 'untracked.md']) {
  test(`mutation checks preserve both baseline and snapshot errors for ${file}`, async t => {
    const output = await runFailingBaseline(t, [file]);
    assert.match(output, /AggregateError: Mutation checks or finalization failed/);
    assert.match(output, /Original baseline failure must survive/);
    assert.match(output, /Mutation checks changed the workspace/);
    assert.doesNotMatch(output, /Workspace unchanged:/);
  });
}
