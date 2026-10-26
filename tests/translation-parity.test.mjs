import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pages } from '../scripts/docs-pages.mjs';
import { pluginRoot } from '../scripts/plugin-root.mjs';

// The validation record's zh-TW page is a deliberate summary of the English
// record, not a translation, so its structure is not expected to match.
const summaries = new Map([['validation', 'zh-TW is a summary of the English validation record']]);

// Identifiers and syntax a translation must carry over verbatim when the English page has them.
const tokens = [
  'no-stdin', '«', 'allowExportOnCheckFailure', 'reviews.json', 'memory.json', 'contentHash',
  'toolingHash', 'sourceHash', 'contextHash', 'review:record', '--profile', 'ras.config.json',
  'profiles/wei.md', 'upgrade-backup', '.credit', 'minCreditSize',
];

// Heading levels outside fenced code, in document order.
export function headingLevels(text) {
  const levels = [];
  let fence = null;
  for (const line of text.split('\n')) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !line.trim().slice(marker[1].length).trim()) fence = null;
      continue;
    }
    if (marker) { fence = marker[1]; continue; }
    const heading = line.match(/^(#{1,6})\s/);
    if (heading) levels.push(heading[1].length);
  }
  return levels;
}

const read = file => readFile(path.join(pluginRoot, file), 'utf8');

test('heading parsing ignores fenced code, including nested fences', () => {
  assert.deepEqual(headingLevels('# A\n````md\n```js\n# not\n```\n## not\n````\n## B\n'), [1, 2]);
});

for (const page of pages.filter(item => !summaries.has(item.slug))) {
  const [en, zh] = [page.en[1], page['zh-TW'][1]];
  test(`${zh} keeps the structure and identifiers of ${en}`, async () => {
    const [english, mandarin] = await Promise.all([read(en), read(zh)]);
    assert.deepEqual(headingLevels(mandarin), headingLevels(english), 'Same number and order of heading levels');
    for (const token of tokens) {
      assert.equal(mandarin.includes(token), english.includes(token), `${token} appears in both or neither`);
    }
  });
}
