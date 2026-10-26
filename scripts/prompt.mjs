import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pluginRoot } from './plugin-root.mjs';

export const operations = ['create', 'outline', 'revise', 'review', 'export', 'remember', 'retro'];

export async function makePrompt(operation, request = '', { chat = false } = {}) {
  if (!operations.includes(operation)) throw new Error(`Choose an operation: ${operations.join(', ')}`);
  const memoryOperation = ['remember', 'retro'].includes(operation);
  const files = memoryOperation ? [
    `skills/${operation}/SKILL.md`, 'references/memory.md', 'roles/chu2.md',
    ...(operation === 'retro' ? ['skills/remember/SKILL.md'] : []),
  ] : [
    `skills/${operation}/SKILL.md`, 'references/workflow.md',
    'references/marp.md', 'references/review.md', 'references/image-rights.md', 'references/memory.md',
    ...['chu2', 'layer', 'pareo', 'lock', 'masking'].map(role => `roles/${role}.md`),
  ];
  files.unshift('references/voice.md');
  const sections = await Promise.all(files.map(async file => `## Source: ${file}\n\n${await readFile(path.join(pluginRoot, file), 'utf8')}`));
  if (memoryOperation) {
    return `# RAS — ${operation}\n\nPlugin root: ${pluginRoot}\nOperation: ${operation}\n\nUse the selected memory operation, not slide creation or export. The host's\npermissions apply. Project paths refer to the selected deck. Read only its\nproject memory; never discover global personal stores.\n${chat ? 'Active host: chat only. No filesystem or shell tools are available. Propose entries for the user to save; do not claim persistence. Do not simulate tool calls.\n' : 'With filesystem tools, perform only authorized memory writes. Without tools, return proposed entries and state that persistence is pending.\n'}\n${sections.join('\n\n')}\n\n## User request\n\n${request || 'Use available session context; ask for the target project if missing.'}\n`;
  }
  if (chat) sections.push('## Active host: chat only\n\nYou have no filesystem, shell, browser, or agent tools in this run. Treat all\nworkflow execution steps above as instructions for the user, not completed work.\nReturn each proposed file in a separate fenced block labelled with its filename.\nPut shell commands in a separate block. Use the existing initialized RAS theme\nunless a change is necessary. For a plan-only request, return the outline only.\nFor a review request, return findings only. Do not simulate tool calls.');
  return `# RAS — RAISE A SLIDE\n\nOperation: ${operation}\nPlugin root: ${pluginRoot}\n\nThese are shared RAS instructions for any model. Follow the current host's\npermissions and tool capabilities. Supporting instructions are expanded below.\nRelative script paths refer to the plugin root; deck commands run in the deck.\n\nWith filesystem and shell tools, carry out the operation and verify its output.\nWithout those tools, return a draft with separately labelled file contents\n(brief.md, outline.md, slides.md, sources.md, and any theme.css changes), plus\ncommands for the user to run in an initialized deck. Preserve existing files\nwhen revising. For review, return findings only. For export without tools, give\nthe build commands and say execution is still required. Never claim to have\nwritten files, inspected pages, checked facts, or exported a PDF without evidence.\nFor --plan, return the narrative plan only. Ask for the contents of referenced\nfiles when your host cannot read them. Never invent the contents of a brief.\n\n${sections.join('\n\n')}\n\n## User request\n\n${request || 'Ask for the presentation topic or the target deck.'}\n`;
}
