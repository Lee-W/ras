import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Two layers of fingerprint. contentHash covers what the speaker writes, so
// reviews stay valid when only the kit tooling is upgraded. toolingHash covers
// the copied kit (scripts, dependencies, notices).
async function hashInputs(root, { files, folders }) {
  const hash = createHash('sha256');
  async function add(relative) {
    const full = path.join(root, relative);
    if (!existsSync(full)) return;
    const entries = await readdir(full, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) throw new Error(`Use real project assets rather than symlinks: ${relative}/${entry.name}`);
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) await add(child);
      else { hash.update(child); hash.update(await readFile(path.join(root, child))); }
    }
  }
  for (const file of files) {
    if (existsSync(path.join(root, file))) { hash.update(file); hash.update(await readFile(path.join(root, file))); }
  }
  for (const folder of folders) await add(folder);
  return hash.digest('hex');
}

// renderHash is the rendering subset of the content. It is the review
// sourceHash and the machine-check key; brief.md, outline.md, and sources.md
// join it in contentHash and in the review contextHash, so a brief edit stales
// reviews but not the machine check.
export const renderHash = root => hashInputs(root, {
  files: ['slides.md', 'theme.css', 'ras.config.json'],
  folders: ['assets', 'images'],
});

export const contentHash = root => hashInputs(root, {
  files: ['brief.md', 'outline.md', 'slides.md', 'sources.md', 'theme.css', 'ras.config.json'],
  folders: ['assets', 'images'],
});

export const toolingHash = root => hashInputs(root, {
  files: ['package.json', 'package-lock.json', 'justfile', 'RAS-LICENSE', 'RAS-NOTICE.md'],
  folders: ['scripts', 'licenses'],
});

export async function projectHashes(root) {
  return { renderHash: await renderHash(root), contentHash: await contentHash(root), toolingHash: await toolingHash(root) };
}
