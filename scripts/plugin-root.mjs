import { fileURLToPath } from 'node:url';

// Repository root. Repo-only: generated decks carry no copy of the plugin.
export const pluginRoot = fileURLToPath(new URL('../', import.meta.url));
