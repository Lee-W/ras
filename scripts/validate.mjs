import assert from 'node:assert/strict';
import { readFile, readdir, stat, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { validateSourceFile } from './source-policy.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = async name => JSON.parse(await readFile(path.join(root, name), 'utf8'));
const pkg = await readJson('package.json');
const manifests = await Promise.all(['plugin.json', '.codex-plugin/plugin.json', '.claude-plugin/plugin.json'].map(readJson));
for (const manifest of manifests) {
  assert.equal(manifest.name, 'ras');
  assert.equal(manifest.version, pkg.version);
  assert.equal(manifest.description, manifests[0].description);
}
const lock = await readJson('package-lock.json');
assert.equal(lock.packages[''].version, pkg.version);
assert.equal(pkg.license, 'MIT');
assert.equal(lock.packages[''].license, pkg.license);
assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies);
// A second copy would mean two browser or engine versions in one deck.
for (const name of ['puppeteer-core', '@marp-team/marp-core']) {
  const nodes = Object.keys(lock.packages).filter(key => key === `node_modules/${name}` || key.endsWith(`/node_modules/${name}`));
  assert.equal(nodes.length, 1, `package-lock.json must contain exactly one ${name} node; found ${nodes.length}: ${nodes.join(', ')}`);
}
async function checkLinks(file, text, { markdownOnly = false } = {}) {
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(https?:|#)/.test(match[1])) continue;
    // Guides show deck-relative example links (images, assets); only cross-file Markdown links are checked there.
    if (markdownOnly && !/\.md(#|$)/.test(match[1])) continue;
    const target = path.resolve(path.dirname(file), match[1].split('#')[0]);
    assert.ok(existsSync(target) && (await stat(target)).isFile(), `Broken reference in ${path.relative(root, file)}: ${match[1]}`);
  }
}
// The root SKILL.md routes to the operation skills; check it with them.
const skillFiles = [
  ...(existsSync(path.join(root, 'SKILL.md')) ? [path.join(root, 'SKILL.md')] : []),
  ...(await readdir(path.join(root, 'skills'))).map(folder => path.join(root, 'skills', folder, 'SKILL.md')),
];
for (const file of skillFiles) {
  const text = await readFile(file, 'utf8');
  assert.match(text, /^---\nname: .+\ndescription: .+\n---/);
  assert.ok(!text.includes('[TODO'), `${file} has unfinished scaffolding`);
  await checkLinks(file, text);
}
// Roles and references are read by the same model; their links must resolve too.
for (const folder of ['roles', 'references'].filter(folder => existsSync(path.join(root, folder)))) {
  for (const name of await readdir(path.join(root, folder))) {
    const file = path.join(root, folder, name);
    await checkLinks(file, await readFile(file, 'utf8'), { markdownOnly: folder === 'references' });
  }
}
if (existsSync(path.join(root, '.git'))) {
  const tracked = execFileSync('git', ['ls-files', '--stage', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const trackedFiles = new Set();
  for (const entry of tracked) {
    const tab = entry.indexOf('\t');
    const [mode, oid, stage] = entry.slice(0, tab).split(' ');
    const file = entry.slice(tab + 1);
    trackedFiles.add(file);
    assert.equal(stage, '0', `Resolve the index conflict before validation: ${file}`);
    const bytes = execFileSync('git', ['cat-file', 'blob', oid], { cwd: root });
    validateSourceFile(file, mode, bytes);
  }
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const file of new Set([...trackedFiles, ...untracked])) {
    const absolute = path.join(root, file);
    let info;
    try { info = await lstat(absolute); }
    catch (error) {
      // An unstaged deletion has no working copy; its indexed blob was checked.
      if (error.code === 'ENOENT' && trackedFiles.has(file)) continue;
      throw error;
    }
    const mode = info.isFile() ? (info.mode & 0o111 ? '100755' : '100644') : (info.mode & 0o170000).toString(8);
    // Reject non-regular files without following symlinks or opening special files.
    const bytes = info.isFile() ? await readFile(absolute) : Buffer.alloc(0);
    validateSourceFile(file, mode, bytes);
  }
  console.log('Staged and working-tree source files are valid.');
} else {
  console.warn('Source-file checks skipped: no Git metadata found. Use a Git checkout to validate staged and working-tree files.');
}
console.log('Plugin identities, dependency lock, skill frontmatter, and skill, role, and reference links are valid.');
