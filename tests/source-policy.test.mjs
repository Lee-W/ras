import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { validateSourceFile } from '../scripts/source-policy.mjs';

async function createValidatorFixture(t) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ras-source-policy-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  for (const name of ['.gitignore', '.claude-plugin', '.codex-plugin', 'plugin.json', 'package.json', 'package-lock.json', 'scripts']) {
    await cp(path.join(root, name), path.join(temporary, name), { recursive: true });
  }
  // Keep this source-policy fixture independent of the real skills' link graph.
  // npm run validate checks the actual plugin skills and their references.
  await mkdir(path.join(temporary, 'skills/source-check'), { recursive: true });
  await mkdir(path.join(temporary, 'references'));
  await writeFile(path.join(temporary, 'skills/source-check/SKILL.md'), '---\nname: source-check\ndescription: Source-policy test fixture\n---\nRead [the fixture reference](../../references/source-check.md).\n');
  await writeFile(path.join(temporary, 'references/source-check.md'), '# Original source-policy fixture\n');
  return temporary;
}

function validate(root) {
  const result = spawnSync(process.execPath, ['scripts/validate.mjs'], { cwd: root, encoding: 'utf8', timeout: 30_000 });
  if (result.error) throw result.error;
  assert.equal(result.signal, null);
  return { status: result.status, output: result.stdout + result.stderr };
}

test('source policy rejects unfamiliar media formats and directories', () => {
  for (const file of ['docs/diagram.avif', 'uploads/diagram.png', 'new-folder/notes.md', '.github/workflows/logo.svg', '.github/workflows/unknown.yml']) {
    assert.throws(() => validateSourceFile(file, '100644', Buffer.from('content')), /Unapproved repository source path/);
  }
});

test('source policy rejects binary files and symlinks disguised as source', () => {
  assert.throws(() => validateSourceFile('docs/notes.md', '100644', Buffer.from([0x89, 0x50, 0])), /Binary content/);
  assert.throws(() => validateSourceFile('docs/notes.md', '100644', Buffer.from([0xff])), /UTF-8/);
  assert.throws(() => validateSourceFile('docs/notes.md', '120000', Buffer.from('../outside')), /regular file/);
  assert.doesNotThrow(() => validateSourceFile('docs/notes.md', '100644', Buffer.from('Original notes.')));
});

test('source validation checks new files before git add', async t => {
  const root = await createValidatorFixture(t);
  execFileSync('git', ['init', '--quiet'], { cwd: root });
  const baseline = validate(root);
  assert.equal(baseline.status, 0, baseline.output);
  assert.match(baseline.output, /Staged and working-tree source files are valid/);
  for (const fixture of [
    { name: 'untracked media/x.png is rejected', file: 'media/x.png', bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]), error: /Unapproved repository source path: media\/x\.png/ },
    { name: 'untracked binary content is rejected', file: 'docs/notes.md', bytes: Buffer.from([0x00]), error: /Binary content is not repository source: docs\/notes\.md/ },
    { name: 'untracked symlinks are rejected without following their target', file: 'docs/notes.md', target: '../missing.md', error: /Source must be a regular file: docs\/notes\.md/ },
  ]) {
    await t.test(fixture.name, async () => {
      const file = path.join(root, fixture.file);
      await mkdir(path.dirname(file), { recursive: true });
      try {
        if (fixture.target) await symlink(fixture.target, file);
        else await writeFile(file, fixture.bytes);
        const result = validate(root);
        assert.equal(result.status, 1, result.output);
        assert.match(result.output, fixture.error);
      } finally { await rm(file, { force: true }); }
    });
  }
});

test('source validation checks unstaged edits and preserves index checks', async t => {
  const root = await createValidatorFixture(t);
  execFileSync('git', ['init', '--quiet'], { cwd: root });
  const file = path.join(root, 'docs/notes.md');
  await mkdir(path.dirname(file));
  const stage = () => execFileSync('git', ['add', '--', 'docs/notes.md'], { cwd: root });
  const original = 'Original notes.\n';
  await writeFile(file, original);
  stage();
  const baseline = validate(root);
  assert.equal(baseline.status, 0, baseline.output);

  t.beforeEach(async () => {
    await rm(file, { force: true });
    await writeFile(file, original);
    stage();
  });
  await t.test('unstaged binary content in a tracked file is rejected', async () => {
    await writeFile(file, Buffer.from([0x00]));
    const result = validate(root);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Binary content is not repository source: docs\/notes\.md/);
  });
  await t.test('unstaged replacement with a symlink is rejected', async () => {
    await rm(file);
    await symlink('../missing.md', file);
    const result = validate(root);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Source must be a regular file: docs\/notes\.md/);
  });
  await t.test('invalid staged content is rejected even with a valid working copy', async () => {
    await rm(file);
    await writeFile(file, Buffer.from([0x00]));
    stage();
    await writeFile(file, original);
    const result = validate(root);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Binary content is not repository source: docs\/notes\.md/);
  });
  await t.test('an unstaged deletion still validates the indexed content', async () => {
    await writeFile(file, Buffer.from([0x00]));
    stage();
    await rm(file);
    const invalid = validate(root);
    assert.equal(invalid.status, 1, invalid.output);
    assert.match(invalid.output, /Binary content is not repository source: docs\/notes\.md/);
    await writeFile(file, original);
    stage();
    await rm(file);
    const valid = validate(root);
    assert.equal(valid.status, 0, valid.output);
    assert.match(valid.output, /Staged and working-tree source files are valid/);
  });
});

test('validation explicitly reports skipped source checks without Git metadata', async t => {
  const root = await createValidatorFixture(t);
  const result = validate(root);
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Source-file checks skipped: no Git metadata found/);
  assert.doesNotMatch(result.output, /Staged and working-tree source files are valid/);
});
