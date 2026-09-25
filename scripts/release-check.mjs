import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(path.join(os.tmpdir(), 'ras-release-check-'));
const run = (command, args) => execFileSync(command, args, { cwd: temporary, encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const git = (...args) => run('git', args);
const cz = (...args) => run('uvx', ['--from', 'commitizen==4.16.2', 'cz', ...args]);
// Match the workflow: only no-new-commits (3) and no-increment (21) are no-ops.
const bump = () => cz('--no-raise', '3,21', 'bump', '--yes');
const readJson = async file => JSON.parse(await readFile(path.join(temporary, file), 'utf8'));
const manifests = ['plugin.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json'];

try {
  const files = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean))];
  for (const file of files) {
    await mkdir(path.dirname(path.join(temporary, file)), { recursive: true });
    await cp(path.join(root, file), path.join(temporary, file));
  }
  git('init', '--quiet');
  git('config', 'user.name', 'RAS release fixture');
  git('config', 'user.email', 'ras-fixture@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'tag.gpgsign', 'false');
  git('config', 'core.hooksPath', '/dev/null');
  git('add', '--', ...files);
  git('commit', '--quiet', '-m', 'feat: initialize release fixture');
  const originalPackage = await readJson('package.json');
  const originalLock = await readJson('package-lock.json');
  const originalManifests = await Promise.all(manifests.map(readJson));
  const [major, minor] = originalPackage.version.split('.').map(Number);
  const expected = `${major}.${minor + 1}.0`;

  // Exercise the first release without a pre-existing version tag.
  bump();
  assert.deepEqual(await readJson('package.json'), { ...originalPackage, version: expected });
  const expectedLock = structuredClone(originalLock);
  expectedLock.version = expected;
  expectedLock.packages[''].version = expected;
  assert.deepEqual(await readJson('package-lock.json'), expectedLock, 'Dependency lock entries must survive a version bump');
  for (const [index, file] of manifests.entries()) {
    assert.deepEqual(await readJson(file), { ...originalManifests[index], version: expected });
  }
  assert.match(git('log', '-1', '--format=%s'), /^bump:/);
  assert.equal(git('tag', '--points-at', 'HEAD'), `v${expected}`);
  assert.ok((await readFile(path.join(temporary, 'CHANGELOG.md'), 'utf8')).includes(expected));
  assert.equal(cz('version', '--project'), expected);
  assert.equal(cz('version', '--project', '--tag'), `v${expected}`);
  const releaseNotes = cz('changelog', '--dry-run', expected);
  assert.ok(releaseNotes.includes(expected));
  assert.match(releaseNotes, /initialize release fixture/);
  run(process.execPath, ['scripts/validate.mjs']);
  console.log('PASS: first release synchronizes npm/plugin versions and preserves dependency pins.');

  const releasedHead = git('rev-parse', 'HEAD');
  bump();
  assert.equal(git('rev-parse', 'HEAD'), releasedHead);
  assert.equal(git('status', '--porcelain'), '');
  console.log('PASS: rerunning an already released commit is a clean no-op.');

  await writeFile(path.join(temporary, 'docs/release-fixture.md'), '# Original release fixture\n');
  git('add', '--', 'docs/release-fixture.md');
  git('commit', '--quiet', '-m', 'docs: add release fixture notes');
  const before = git('rev-parse', 'HEAD');
  bump();
  assert.equal(git('rev-parse', 'HEAD'), before);
  assert.equal(git('status', '--porcelain'), '');
  console.log('PASS: documentation-only commits do not create another release.');
} finally { await rm(temporary, { recursive: true, force: true }); }
