#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile, realpath } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const pluginRoot = fileURLToPath(new URL('../', import.meta.url));
const operations = ['create', 'revise', 'review', 'export', 'remember', 'retro'];

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
  const sections = await Promise.all(files.map(async file => `## Source: ${file}\n\n${await readFile(path.join(pluginRoot, file), 'utf8')}`));
  if (memoryOperation) {
    return `# RAS — ${operation}\n\nPlugin root: ${pluginRoot}\nOperation: ${operation}\n\nUse the selected memory operation, not slide creation or export. The host's\npermissions apply. Project paths refer to the selected deck. Read only its\nproject memory; never discover global personal stores.\n${chat ? 'Active host: chat only. No filesystem or shell tools are available. Propose entries for the user to save; do not claim persistence. Do not simulate tool calls.\n' : 'With filesystem tools, perform only authorized memory writes. Without tools, return proposed entries and state that persistence is pending.\n'}\n${sections.join('\n\n')}\n\n## User request\n\n${request || 'Use available session context; ask for the target project if missing.'}\n`;
  }
  if (chat) sections.push('## Active host: chat only\n\nYou have no filesystem, shell, browser, or agent tools in this run. Treat all\nworkflow execution steps above as instructions for the user, not completed work.\nReturn each proposed file in a separate fenced block labelled with its filename.\nPut shell commands in a separate block. Use the existing initialized RAS theme\nunless a change is necessary. For a plan-only request, return the outline only.\nFor a review request, return findings only. Do not simulate tool calls.');
  return `# RAS — RAISE A SLIDE\n\nOperation: ${operation}\nPlugin root: ${pluginRoot}\n\nThese are shared RAS instructions for any model. Follow the current host's\npermissions and tool capabilities. Supporting instructions are expanded below.\nRelative script paths refer to the plugin root; deck commands run in the deck.\n\nWith filesystem and shell tools, carry out the operation and verify its output.\nWithout those tools, return a draft with separately labelled file contents\n(brief.md, outline.md, slides.md, sources.md, and any theme.css changes), plus\ncommands for the user to run in an initialized deck. Preserve existing files\nwhen revising. For review, return findings only. For export without tools, give\nthe build commands and say execution is still required. Never claim to have\nwritten files, inspected pages, checked facts, or exported a PDF without evidence.\nFor --plan, return the narrative plan only. Ask for the contents of referenced\nfiles when your host cannot read them. Never invent the contents of a brief.\n\n${sections.join('\n\n')}\n\n## User request\n\n${request || 'Ask for the presentation topic or the target deck.'}\n`;
}

export async function initDeck(destination) {
  if (!destination) throw new Error('Usage: node scripts/ras.mjs init <new-directory>');
  const target = path.resolve(destination);
  if (existsSync(target)) throw new Error(`Destination already exists: ${target}`);
  await mkdir(target, { recursive: true });
  await cp(path.join(pluginRoot, 'templates'), target, { recursive: true });
  await cp(path.join(pluginRoot, 'references/review.md'), path.join(target, 'review-guide.md'));
  await cp(path.join(pluginRoot, 'references/memory.md'), path.join(target, 'memory-guide.md'));
  await cp(path.join(pluginRoot, 'references/image-rights.md'), path.join(target, 'image-rights-guide.md'));
  await cp(path.join(pluginRoot, 'docs/image-rights-zh-tw.md'), path.join(target, 'image-rights-guide-zh-tw.md'));
  // Keep the standalone guides' language links local to the generated project.
  for (const file of ['review-guide.md', 'image-rights-guide.md', 'image-rights-guide-zh-tw.md']) {
    const guide = await readFile(path.join(target, file), 'utf8');
    await writeFile(path.join(target, file), guide.replaceAll('../references/image-rights.md', 'image-rights-guide.md').replaceAll('../docs/image-rights-zh-tw.md', 'image-rights-guide-zh-tw.md').replaceAll('(image-rights.md)', '(image-rights-guide.md)').replaceAll('(image-rights-zh-tw.md)', '(image-rights-guide-zh-tw.md)'));
  }
  await mkdir(path.join(target, 'licenses', 'ras'), { recursive: true });
  await cp(path.join(pluginRoot, 'LICENSE'), path.join(target, 'licenses', 'ras', 'MIT.txt'));
  await cp(path.join(pluginRoot, 'NOTICE.md'), path.join(target, 'licenses', 'ras', 'NOTICE.md'));
  await mkdir(path.join(target, 'scripts'));
  await mkdir(path.join(target, 'assets'));
  for (const name of ['deck.mjs', 'project.mjs', 'probe.mjs', 'fonts.mjs', 'review.mjs', 'state.mjs', 'memory.mjs']) {
    await cp(path.join(pluginRoot, 'scripts', name), path.join(target, 'scripts', name));
  }
  const pkg = JSON.parse(await readFile(path.join(pluginRoot, 'package.json'), 'utf8'));
  delete pkg.bin;
  // The speaker chooses a licence for their talk; only the copied RAS kit is MIT.
  pkg.license = 'UNLICENSED';
  pkg.scripts = Object.fromEntries(Object.entries(pkg.scripts).filter(([name]) => ['build', 'check', 'export', 'preview', 'doctor', 'status', 'review:record', 'memory'].includes(name)));
  await writeFile(path.join(target, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  const lock = JSON.parse(await readFile(path.join(pluginRoot, 'package-lock.json'), 'utf8'));
  lock.packages[''].license = pkg.license;
  delete lock.packages[''].bin;
  await writeFile(path.join(target, 'package-lock.json'), JSON.stringify(lock, null, 2) + '\n');
  await writeFile(path.join(target, '.gitignore'), 'node_modules/\ndist/\n.ras/\n.DS_Store\n*.log\n');
  await writeFile(path.join(target, 'README.md'), `# RAS presentation\n\nEdit slides.md, brief.md, sources.md, and theme.css.\n\n\`\`\`sh\nnpm ci\nnpm run doctor\nnpm run export\nnpm run preview\n\`\`\`\n\nBuild: dist/index.html. Export: dist/slides.pdf and dist/notes.txt.\nChecks: .ras/check.json. Previews: .ras/previews/.\n\nThe project is self-contained and does not require the RAS plugin.\nNode 22.18+ is required. If npm skips Puppeteer's browser install, run\n\`npx puppeteer browsers install chrome\`, or set RAS_BROWSER_PATH to an\nexisting Chrome/Chromium executable.\n\nHTML contains presenter notes. Use the PDF for an audience-only handout.\nMachine checks do not replace visual review, source verification, or rehearsal.\n`);
  await writeFile(path.join(target, 'README.md'), '\nPinned Latin fonts and fonts for Taiwanese Mandarin in traditional characters are copied during build; Mermaid SVGs embed their label fonts. Licences remain in dist/assets/fonts/.\n\nUse `npm run status` to check review freshness, and `npm run review:record -- .ras/visual-review.json` to record work actually performed. See [the review guide](review-guide.md) for record fields.\n\nUse `npm run memory -- list` and `npm run memory -- save .ras/memory-candidate.json` for project-local preferences. See [the memory guide](memory-guide.md). Reviews and memories stay in the ignored .ras/ directory.\n', { flag: 'a' });
  await writeFile(path.join(target, 'README.md'), '\nCheck all supplied images using [image rights and credits](image-rights-guide.md) / [圖片權利與標示](image-rights-guide-zh-tw.md). Record use permission and required visible credits in sources.md; missing evidence keeps the deck unverified.\n\n## Licensing\n\nYou choose the licence for your presentation. Supplied assets keep their own terms. The package starts as UNLICENSED because no distribution licence has been selected for your content.\n\nThe included RAS tools, original starter content, and theme use the standard [MIT licence](licenses/ras/MIT.txt). See [licence scope / 授權適用範圍](licenses/README.md) and [third-party rights](licenses/ras/NOTICE.md). Build output preserves licenses/ and the dependency font notices in dist/assets/fonts/.\n', { flag: 'a' });
  console.log(`Created ${target}\nNext: npm ci, then npm run export in that directory.`);
  return target;
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  try {
    if (process.argv[2] === 'init' && process.argv.length === 4) await initDeck(process.argv[3]);
    else if (process.argv[2] === 'prompt') {
      const args = process.argv.slice(4);
      process.stdout.write(await makePrompt(process.argv[3], args.filter(arg => arg !== '--chat').join(' '), { chat: args.includes('--chat') }));
    } else throw new Error('Usage: node scripts/ras.mjs init <new-directory> | prompt <create|revise|review|export|remember|retro> [--chat] [request]');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
