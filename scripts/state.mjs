import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

// Private generated state stays in the selected project, even with symlinks present.
async function statePath(root, name) {
  if (!/^[a-z-]+\.json$/.test(name)) throw new Error('Invalid state filename');
  const directory = path.join(root, '.ras');
  for (const [file, directoryExpected] of [[directory, true], [path.join(directory, name), false]]) {
    try {
      const info = await lstat(file);
      if (info.isSymbolicLink() || (directoryExpected ? !info.isDirectory() : !info.isFile())) {
        throw new Error(`Use a real project ${directoryExpected ? 'directory' : 'file'}: ${file}`);
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return path.join(directory, name);
}

export async function readState(root, name) {
  const file = await statePath(root, name);
  try {
    const value = JSON.parse(await readFile(file, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid project state: ${file}`);
    return value;
  }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export async function writeState(root, name, value) {
  const file = await statePath(root, name);
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    await rename(temporary, file);
  } finally { await rm(temporary, { force: true }); }
}
