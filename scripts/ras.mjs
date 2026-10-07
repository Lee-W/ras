#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile, realpath } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const pluginRoot = fileURLToPath(new URL('../', import.meta.url));
export const operations = ['create', 'outline', 'revise', 'review', 'export', 'remember', 'retro'];

export async function makePrompt(operation, request = '', { chat = false } = {}) {
  if (!operations.includes(operation)) throw new Error(`Choose an operation: ${operations.join(', ')}`);
  const memoryOperation = ['remember', 'retro'].includes(operation);
  const files = memoryOperation ? [
    `skills/${operation}/SKILL.md`, 'references/memory.md', 'agents/chu2.md',
    ...(operation === 'retro' ? ['skills/remember/SKILL.md'] : []),
  ] : [
    `skills/${operation}/SKILL.md`, 'references/workflow.md',
    'references/marp.md', 'references/review.md', 'references/image-rights.md', 'references/memory.md',
    ...['chu2', 'layer', 'pareo', 'lock', 'masking'].map(role => `agents/${role}.md`),
  ];
  files.unshift('skills/orchestrator-voice/SKILL.md');
  const sections = await Promise.all(files.map(async file => `## Source: ${file}\n\n${await readFile(path.join(pluginRoot, file), 'utf8')}`));
  if (memoryOperation) {
    return `# RAS — ${operation}\n\nPlugin root: ${pluginRoot}\nOperation: ${operation}\n\nUse the selected memory operation, not slide creation or export. The host's\npermissions apply. Project paths refer to the selected deck. Read only its\nproject memory; never discover global personal stores.\n${chat ? 'Active host: chat only. No filesystem or shell tools are available. Propose entries for the user to save; do not claim persistence. Do not simulate tool calls.\n' : 'With filesystem tools, perform only authorized memory writes. Without tools, return proposed entries and state that persistence is pending.\n'}\n${sections.join('\n\n')}\n\n## User request\n\n${request || 'Use available session context; ask for the target project if missing.'}\n`;
  }
  if (chat) sections.push('## Active host: chat only\n\nYou have no filesystem, shell, browser, or agent tools in this run. Treat all\nworkflow execution steps above as instructions for the user, not completed work.\nReturn each proposed file in a separate fenced block labelled with its filename.\nPut shell commands in a separate block. Use the existing initialized RAS theme\nunless a change is necessary. For a plan-only request, return the outline only.\nFor a review request, return findings only. Do not simulate tool calls.');
  return `# RAS — RAISE A SLIDE\n\nOperation: ${operation}\nPlugin root: ${pluginRoot}\n\nThese are shared RAS instructions for any model. Follow the current host's\npermissions and tool capabilities. Supporting instructions are expanded below.\nRelative script paths refer to the plugin root; deck commands run in the deck.\n\nWith filesystem and shell tools, carry out the operation and verify its output.\nWithout those tools, return a draft with separately labelled file contents\n(brief.md, outline.md, slides.md, sources.md, and any theme.css changes), plus\ncommands for the user to run in an initialized deck. Preserve existing files\nwhen revising. For review, return findings only. For export without tools, give\nthe build commands and say execution is still required. Never claim to have\nwritten files, inspected pages, checked facts, or exported a PDF without evidence.\nFor --plan, return the narrative plan only. Ask for the contents of referenced\nfiles when your host cannot read them. Never invent the contents of a brief.\n\n${sections.join('\n\n')}\n\n## User request\n\n${request || 'Ask for the presentation topic or the target deck.'}\n`;
}

const deckScripts = ['deck.mjs', 'project.mjs', 'probe.mjs', 'fonts.mjs', 'review.mjs', 'state.mjs', 'memory.mjs'];
const deckPackageScripts = ['build', 'check', 'export', 'preview', 'doctor', 'status', 'review:record', 'memory'];
const deckIgnore = ['node_modules/', 'dist/', '.ras/', '.DS_Store', '*.log'];
const kitTemplates = ['justfile', 'licenses/README.md'];
// The speaker owns these after initialization; upgrade never replaces them.
export const contentTemplates = ['brief.md', 'slides.md', 'sources.md', 'theme.css', 'ras.config.json'];
// Earlier releases shipped these; current builds no longer read them.
const legacyKitFiles = ['RAS-LICENSE', 'RAS-NOTICE.md'];
const kitPackageName = '@ras/slide-kit';

// The single source of the tool files a deck carries. init writes them;
// upgrade compares and replaces them.
export async function kitFiles() {
  const files = new Map();
  const read = file => readFile(path.join(pluginRoot, file));
  for (const file of kitTemplates) files.set(file, await read(`templates/${file}`));
  // Keep the standalone guides' language links local to the generated project.
  const localLinks = guide => guide.replaceAll('../references/image-rights.md', 'image-rights-guide.md').replaceAll('../docs/image-rights-zh-tw.md', 'image-rights-guide-zh-tw.md').replaceAll('(image-rights.md)', '(image-rights-guide.md)').replaceAll('(image-rights-zh-tw.md)', '(image-rights-guide-zh-tw.md)');
  for (const [source, destination, rewrite] of [
    ['references/review.md', 'review-guide.md', true],
    ['references/memory.md', 'memory-guide.md', false],
    ['references/image-rights.md', 'image-rights-guide.md', true],
    ['docs/image-rights-zh-tw.md', 'image-rights-guide-zh-tw.md', true],
  ]) files.set(destination, rewrite ? Buffer.from(localLinks(await readFile(path.join(pluginRoot, source), 'utf8'))) : await read(source));
  files.set('licenses/ras/MIT.txt', await read('LICENSE'));
  files.set('licenses/ras/NOTICE.md', await read('NOTICE.md'));
  for (const name of deckScripts) files.set(`scripts/${name}`, await read(`scripts/${name}`));
  const pkg = JSON.parse(await readFile(path.join(pluginRoot, 'package.json'), 'utf8'));
  delete pkg.bin;
  // The speaker chooses a licence for their talk; only the copied RAS kit is MIT.
  pkg.license = 'UNLICENSED';
  pkg.scripts = Object.fromEntries(Object.entries(pkg.scripts).filter(([name]) => deckPackageScripts.includes(name)));
  files.set('package.json', Buffer.from(JSON.stringify(pkg, null, 2) + '\n'));
  const lock = JSON.parse(await readFile(path.join(pluginRoot, 'package-lock.json'), 'utf8'));
  lock.packages[''].license = pkg.license;
  delete lock.packages[''].bin;
  files.set('package-lock.json', Buffer.from(JSON.stringify(lock, null, 2) + '\n'));
  files.set('README.md', Buffer.from([
    `# RAS presentation\n\nEdit slides.md, brief.md, sources.md, and theme.css.\n\n\`\`\`sh\nnpm ci\nnpm run doctor\nnpm run export\nnpm run preview\n\`\`\`\n\nBuild: dist/index.html. Export: dist/slides.pdf and dist/notes.txt.\nChecks: .ras/check.json. Previews: .ras/previews/.\n\nThe project is self-contained and does not require the RAS plugin.\nNode 22.18+ is required. If npm skips Puppeteer's browser install, run\n\`npx puppeteer browsers install chrome\`, or set RAS_BROWSER_PATH to an\nexisting Chrome/Chromium executable.\n\nHTML contains presenter notes. Use the PDF for an audience-only handout.\nMachine checks do not replace visual review, source verification, or rehearsal.\n`,
    '\nPinned Latin fonts and fonts for Taiwanese Mandarin in traditional characters are copied during build; Mermaid SVGs embed their label fonts. Licences remain in dist/assets/fonts/.\n\nUse `npm run status` to check review freshness, and `npm run review:record -- .ras/visual-review.json` to record work actually performed. See [the review guide](review-guide.md) for record fields.\n\nUse `npm run memory -- list` and `npm run memory -- save .ras/memory-candidate.json` for project-local preferences. See [the memory guide](memory-guide.md). Reviews and memories stay in the ignored .ras/ directory.\n',
    '\nCheck all supplied images using [image rights and credits](image-rights-guide.md) / [圖片權利與標示](image-rights-guide-zh-tw.md). Record use permission and required visible credits in sources.md; missing evidence keeps the deck unverified.\n\n## Licensing\n\nYou choose the licence for your presentation. Supplied assets keep their own terms. The package starts as UNLICENSED because no distribution licence has been selected for your content.\n\nThe included RAS tools, original starter content, and theme use the standard [MIT licence](licenses/ras/MIT.txt). See [licence scope / 授權適用範圍](licenses/README.md) and [third-party rights](licenses/ras/NOTICE.md). Build output preserves licenses/ and the dependency font notices in dist/assets/fonts/.\n',
    '\n## Optional Just commands\n\nThis standalone project includes a `justfile`. If [Just](https://just.systems/man/en/) is installed, run these commands inside the project:\n\n```sh\njust deps\njust doctor\njust build\njust preview\n```\n\n`just build` (or `just export`) runs `npm run export` and requires `dist/slides.pdf`; `just html` runs the HTML-only build. All npm commands above also work without Just.\n\nThe preview command preserves the PDF and verification evidence while the built source is unchanged. If the source changes or HTML is missing, preview rebuilds HTML and discards outdated output. Rebuild and refresh after edits while the preview server is running.\n\n`just html` and `just check` replace `dist/`, removing any previous PDF; run `just build` afterward to export again.\n',
  ].join('')));
  return files;
}

export async function initDeck(destination) {
  if (!destination) throw new Error('Usage: node scripts/ras.mjs init <new-directory>');
  const target = path.resolve(destination);
  if (existsSync(target)) throw new Error(`Destination already exists: ${target}`);
  await mkdir(target, { recursive: true });
  await cp(path.join(pluginRoot, 'templates'), target, { recursive: true });
  await mkdir(path.join(target, 'assets'));
  await writeFile(path.join(target, '.gitignore'), deckIgnore.join('\n') + '\n');
  for (const [file, bytes] of await kitFiles()) {
    await mkdir(path.dirname(path.join(target, file)), { recursive: true });
    await writeFile(path.join(target, file), bytes);
  }
  console.log(`Created ${target}\nNext: npm ci, then npm run export in that directory (or just deps, then just build).`);
  return target;
}

async function readDeckVersion(file) {
  try { return JSON.parse(await readFile(file, 'utf8')).version || 'unknown'; } catch { return 'unknown'; }
}

// Merge-only files: the speaker's values win; only missing entries are added.
async function mergeConfig(target) {
  const template = await readFile(path.join(pluginRoot, 'templates/ras.config.json'));
  const file = path.join(target, 'ras.config.json');
  if (!existsSync(file)) return { action: 'add', bytes: template };
  const current = await readFile(file, 'utf8');
  let config;
  try { config = JSON.parse(current); } catch (error) { throw new Error(`Cannot upgrade: ras.config.json is not valid JSON (${error.message})`); }
  const missing = Object.keys(JSON.parse(template)).filter(key => !(key in config));
  if (!missing.length) return { action: 'unchanged' };
  for (const key of missing) config[key] = JSON.parse(template)[key];
  return { action: 'merge', bytes: Buffer.from(JSON.stringify(config, null, 2) + '\n'), detail: `adds ${missing.join(', ')}; existing values kept` };
}

async function mergeIgnore(target) {
  const file = path.join(target, '.gitignore');
  if (!existsSync(file)) return { action: 'add', bytes: Buffer.from(deckIgnore.join('\n') + '\n') };
  const current = await readFile(file, 'utf8');
  const lines = new Set(current.split(/\r?\n/).map(line => line.trim()));
  const missing = deckIgnore.filter(line => !lines.has(line));
  if (!missing.length) return { action: 'unchanged' };
  const separator = current === '' || current.endsWith('\n') ? '' : '\n';
  return { action: 'merge', bytes: Buffer.from(current + separator + missing.join('\n') + '\n'), detail: `adds ${missing.join(', ')}; existing rules kept` };
}

export async function upgradeDeck(directory, { apply = false, log = console.log, now = new Date() } = {}) {
  if (!directory) throw new Error('Usage: node scripts/ras.mjs upgrade <deck-directory> [--dry-run | --yes]');
  const target = path.resolve(directory);
  if (!existsSync(target)) throw new Error(`Deck directory not found: ${target}`);
  if (await realpath(target) === await realpath(pluginRoot)) throw new Error('Refusing to upgrade the RAS repository itself; pass a generated deck directory.');
  const pkgFile = path.join(target, 'package.json');
  let deckPackage;
  try { deckPackage = JSON.parse(await readFile(pkgFile, 'utf8')); } catch { deckPackage = undefined; }
  if (deckPackage?.name !== kitPackageName) throw new Error(`Not a RAS deck: ${target} (expected package.json named ${kitPackageName})`);
  const from = deckPackage.version || 'unknown';
  const to = JSON.parse(await readFile(path.join(pluginRoot, 'package.json'), 'utf8')).version;

  const changes = [];
  for (const [file, bytes] of await kitFiles()) {
    const full = path.join(target, file);
    if (!existsSync(full)) changes.push({ file, action: 'add', bytes });
    else if (!(await readFile(full)).equals(bytes)) changes.push({ file, action: 'update', bytes, detail: from === to ? `local edits differ from RAS ${to}` : `differs from RAS ${to}` });
    else changes.push({ file, action: 'unchanged' });
  }
  changes.push({ file: 'ras.config.json', ...await mergeConfig(target) });
  changes.push({ file: '.gitignore', ...await mergeIgnore(target) });
  const order = ['add', 'update', 'merge', 'unchanged'];
  changes.sort((a, b) => order.indexOf(a.action) - order.indexOf(b.action) || a.file.localeCompare(b.file));
  const pending = changes.filter(change => change.action !== 'unchanged');
  const backup = path.join(target, '.ras', `upgrade-backup-${now.toISOString().replace(/[:.]/g, '-')}`);

  log(`RAS deck upgrade: ${target}`);
  log(`slide-kit version: ${from} -> ${to}`);
  for (const change of changes) {
    const note = change.action === 'update' ? ` (${change.detail}; previous copy ${apply ? 'backed up' : 'will be backed up'})`
      : change.action === 'merge' ? ` (${change.detail}; previous copy ${apply ? 'backed up' : 'will be backed up'})` : '';
    log(`  ${change.action.padEnd(10)}${change.file}${note}`);
  }
  const legacy = legacyKitFiles.filter(file => existsSync(path.join(target, file)));
  if (legacy.length) log(`Left in place (no longer used by RAS; remove if unneeded): ${legacy.join(', ')}`);
  const reinstall = pending.some(change => ['package.json', 'package-lock.json'].includes(change.file));
  if (!pending.length) {
    log(`Already up to date with RAS ${to}. Nothing written.`);
    return { target, from, to, changes, applied: false };
  }
  if (!apply) {
    log('Dry run: nothing written. Re-run with --yes to apply.');
    return { target, from, to, changes, applied: false };
  }
  const replaced = pending.filter(change => existsSync(path.join(target, change.file)));
  for (const change of replaced) {
    await mkdir(path.dirname(path.join(backup, change.file)), { recursive: true });
    await cp(path.join(target, change.file), path.join(backup, change.file), { errorOnExist: true, force: false });
  }
  for (const change of pending) {
    await mkdir(path.dirname(path.join(target, change.file)), { recursive: true });
    await writeFile(path.join(target, change.file), change.bytes);
  }
  if (replaced.length) log(`Backup of replaced files: ${backup}`);
  const count = action => pending.filter(change => change.action === action).length;
  log(`Upgraded to RAS ${to}: ${count('add')} added, ${count('update')} updated, ${count('merge')} merged.`);
  log(`Next: ${reinstall ? 'npm ci, then ' : ''}npm run export`);
  return { target, from, to, changes, applied: true, backup: replaced.length ? backup : undefined };
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  try {
    if (process.argv[2] === 'init' && process.argv.length === 4) await initDeck(process.argv[3]);
    else if (process.argv[2] === 'upgrade') {
      const args = process.argv.slice(3);
      const flags = args.filter(arg => arg.startsWith('--'));
      const positional = args.filter(arg => !arg.startsWith('--'));
      if (positional.length !== 1 || flags.some(flag => !['--dry-run', '--yes'].includes(flag)) || (flags.includes('--dry-run') && flags.includes('--yes'))) {
        throw new Error('Usage: node scripts/ras.mjs upgrade <deck-directory> [--dry-run | --yes]');
      }
      await upgradeDeck(positional[0], { apply: flags.includes('--yes') });
    }
    else if (process.argv[2] === 'prompt') {
      const args = process.argv.slice(4);
      process.stdout.write(await makePrompt(process.argv[3], args.filter(arg => arg !== '--chat').join(' '), { chat: args.includes('--chat') }));
    } else throw new Error(`Usage: node scripts/ras.mjs init <new-directory> | upgrade <deck-directory> [--dry-run | --yes] | prompt <${operations.join('|')}> [--chat] [request]`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
