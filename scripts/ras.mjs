#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const pluginRoot = fileURLToPath(new URL('../', import.meta.url));
const operations = ['create', 'revise', 'review', 'export'];

export async function makePrompt(operation, request = '', { chat = false } = {}) {
  if (!operations.includes(operation)) throw new Error(`Choose an operation: ${operations.join(', ')}`);
  const files = [
    `skills/${operation}/SKILL.md`, 'references/workflow.md',
    'references/marp.md', 'references/review.md',
    ...['chu2', 'layer', 'pareo', 'lock', 'masking'].map(role => `agents/${role}.md`),
  ];
  const sections = await Promise.all(files.map(async file => `## Source: ${file}\n\n${await readFile(path.join(pluginRoot, file), 'utf8')}`));
  if (chat) sections.push('## Active host: chat only\n\nYou have no filesystem, shell, browser, or agent tools in this run. Treat all\nworkflow execution steps above as instructions for the user, not completed work.\nReturn each proposed file in a separate fenced block labelled with its filename.\nPut shell commands in a separate block. Use the existing initialized RAS theme\nunless a change is necessary. For a plan-only request, return the outline only.\nFor a review request, return findings only. Do not simulate tool calls.');
  return `# RAS — RAISE A SLIDE\n\nOperation: ${operation}\nPlugin root: ${pluginRoot}\n\nThese are shared RAS instructions for any model. Follow the current host's\npermissions and tool capabilities. Supporting instructions are expanded below.\nRelative script paths refer to the plugin root; deck commands run in the deck.\n\nWith filesystem and shell tools, carry out the operation and verify its output.\nWithout those tools, return a draft with separately labelled file contents\n(brief.md, outline.md, slides.md, sources.md, and any theme.css changes), plus\ncommands for the user to run in an initialized deck. Preserve existing files\nwhen revising. For review, return findings only. For export without tools, give\nthe build commands and say execution is still required. Never claim to have\nwritten files, inspected pages, checked facts, or exported a PDF without evidence.\nFor --plan, return the narrative plan only. Ask for the contents of referenced\nfiles when your host cannot read them. Never invent the contents of a brief.\n\n${sections.join('\n\n')}\n\n## User request\n\n${request || 'Ask for the presentation topic or the target deck.'}\n`;
}

export async function initDeck(destination) {
  if (!destination) throw new Error('Usage: node scripts/ras.mjs init <new-directory>');
  const target = path.resolve(destination);
  if (existsSync(target)) throw new Error(`Destination already exists: ${target}`);
  await mkdir(target, { recursive: true });
  await cp(path.join(pluginRoot, 'templates'), target, { recursive: true });
  await mkdir(path.join(target, 'scripts'));
  await mkdir(path.join(target, 'assets'));
  for (const name of ['deck.mjs', 'project.mjs', 'probe.mjs']) {
    await cp(path.join(pluginRoot, 'scripts', name), path.join(target, 'scripts', name));
  }
  const pkg = JSON.parse(await readFile(path.join(pluginRoot, 'package.json'), 'utf8'));
  delete pkg.bin;
  pkg.scripts = Object.fromEntries(Object.entries(pkg.scripts).filter(([name]) => ['build', 'check', 'export', 'preview', 'doctor'].includes(name)));
  await writeFile(path.join(target, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  await cp(path.join(pluginRoot, 'package-lock.json'), path.join(target, 'package-lock.json'));
  await writeFile(path.join(target, '.gitignore'), 'node_modules/\ndist/\n.ras/\n.DS_Store\n*.log\n');
  await writeFile(path.join(target, 'README.md'), `# RAS presentation\n\nEdit slides.md, brief.md, sources.md, and theme.css.\n\n\`\`\`sh\nnpm ci\nnpm run doctor\nnpm run export\nnpm run preview\n\`\`\`\n\nBuild: dist/index.html. Export: dist/slides.pdf and dist/notes.txt.\nChecks: .ras/check.json. Previews: .ras/previews/.\n\nThe project is self-contained and does not require the RAS plugin.\nNode 22.18+ is required. If npm skips Puppeteer's browser install, run\n\`npx puppeteer browsers install chrome\`, or set RAS_BROWSER_PATH to an\nexisting Chrome/Chromium executable.\n\nHTML contains presenter notes. Use the PDF for an audience-only handout.\nMachine checks do not replace visual review, source verification, or rehearsal.\n`);
  console.log(`Created ${target}\nNext: npm ci, then npm run export in that directory.`);
  return target;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv[2] === 'init' && process.argv.length === 4) await initDeck(process.argv[3]);
    else if (process.argv[2] === 'prompt') {
      const args = process.argv.slice(4);
      process.stdout.write(await makePrompt(process.argv[3], args.filter(arg => arg !== '--chat').join(' '), { chat: args.includes('--chat') }));
    } else throw new Error('Usage: node scripts/ras.mjs init <new-directory> | prompt <create|revise|review|export> [--chat] [request]');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
