import { realpath } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Shared entry-point plumbing: run `work(args)` only when the module is the
// executed script (symlinked installs included), and report failures as
// `[label] message` with a non-zero exit code. RAS_DEBUG adds the stack.
// `label` is a string or a function of the arguments (usually the subcommand).
export async function runMain(metaUrl, label, work) {
  if (!process.argv[1] || metaUrl !== pathToFileURL(await realpath(process.argv[1])).href) return;
  const args = process.argv.slice(2);
  try { await work(args); }
  catch (error) {
    console.error(`[${typeof label === 'function' ? label(args) : label}] ${process.env.RAS_DEBUG ? error.stack : error.message}`);
    process.exitCode = 1;
  }
}
