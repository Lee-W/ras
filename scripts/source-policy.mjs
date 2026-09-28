import assert from 'node:assert/strict';
import { TextDecoder } from 'node:util';

const rootFiles = new Set([
  '.gitignore', 'AGENTS.md', 'README.md', 'README.zh-TW.md', 'SKILL.md', 'LICENSE', 'NOTICE.md', 'package.json',
  'package-lock.json', 'plugin.json', '.codex-plugin/plugin.json',
  '.claude-plugin/plugin.json',
  '.cz.toml', 'CHANGELOG.md', '.github/workflows/ci.yml',
  '.github/workflows/bumpversion.yml',
  'templates/licenses/README.md',
]);
const sourcePaths = [
  /^(agents|profiles|references|docs)\/[a-z0-9-]+\.md$/,
  /^skills\/[a-z0-9-]+\/SKILL\.md$/,
  /^(scripts|tests)\/[a-z0-9.-]+\.mjs$/,
  /^templates\/(slides\.md|brief\.md|sources\.md|theme\.css|ras\.config\.json)$/,
];

// This constrains source paths and file types; provenance still needs review.
export function validateSourceFile(file, mode, bytes) {
  assert.ok(rootFiles.has(file) || sourcePaths.some(pattern => pattern.test(file)), `Unapproved repository source path: ${file}`);
  assert.ok(mode === '100644' || mode === '100755', `Source must be a regular file: ${file}`);
  assert.ok(!bytes.includes(0), `Binary content is not repository source: ${file}`);
  try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error(`Source must be UTF-8 text: ${file}`); }
}
