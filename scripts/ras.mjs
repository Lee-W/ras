#!/usr/bin/env node
import { runMain } from './cli.mjs';
import { makePrompt, operations } from './prompt.mjs';
import { initDeck, upgradeDeck } from './scaffold.mjs';

await runMain(import.meta.url, args => args[0] ?? 'ras', async args => {
  if (args[0] === 'init' && args.length === 2) await initDeck(args[1]);
  else if (args[0] === 'upgrade') {
    const rest = args.slice(1);
    const flags = rest.filter(arg => arg.startsWith('--'));
    const positional = rest.filter(arg => !arg.startsWith('--'));
    if (positional.length !== 1 || flags.some(flag => !['--dry-run', '--yes'].includes(flag)) || (flags.includes('--dry-run') && flags.includes('--yes'))) {
      throw new Error('Usage: node scripts/ras.mjs upgrade <deck-directory> [--dry-run | --yes]');
    }
    await upgradeDeck(positional[0], { apply: flags.includes('--yes') });
  } else if (args[0] === 'prompt') {
    const request = [];
    let chat = false;
    let profile;
    for (let index = 2; index < args.length; index++) {
      if (args[index] === '--chat') chat = true;
      else if (args[index] === '--profile') {
        profile = args[++index];
        if (!profile) throw new Error('--profile needs a file path');
      } else request.push(args[index]);
    }
    process.stdout.write(await makePrompt(args[1], request.join(' '), { chat, profile }));
  } else throw new Error(`Usage: node scripts/ras.mjs init <new-directory> | upgrade <deck-directory> [--dry-run | --yes] | prompt <${operations.join('|')}> [--chat] [--profile <path>] [request]`);
});
