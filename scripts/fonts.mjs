import assert from 'node:assert/strict';
import { cp, mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const tcRoot = path.dirname(require.resolve('@fontsource-variable/noto-sans-tc/package.json'));

async function mandarinFaces() {
  const css = await readFile(path.join(tcRoot, 'wght.css'), 'utf8');
  const faces = [...css.matchAll(/@font-face\s*\{[^}]+\}/g)].map(([block]) => {
    const file = block.match(/url\(\.\/files\/([a-z0-9-]+\.woff2)\)/)?.[1];
    const unicodeRange = block.match(/unicode-range:\s*([^;]+);/)?.[1];
    assert.ok(file && unicodeRange, 'Unsupported Noto Sans TC package CSS');
    return { file, unicodeRange, family: 'RAS CJK', weight: '100 900', block: block.replaceAll('Noto Sans TC Variable', 'RAS CJK') };
  });
  assert.ok(faces.length, 'Noto Sans TC font faces are missing');
  return faces;
}

export async function prepareFonts(dist) {
  const out = path.join(dist, 'assets', 'fonts');
  await mkdir(out, { recursive: true });
  for (const [family, weight] of [['roboto', 400], ['roboto', 700], ['roboto-condensed', 700], ['roboto-mono', 400]]) {
    const pkg = path.dirname(require.resolve(`@fontsource/${family}/package.json`));
    await cp(path.join(pkg, 'files', `${family}-latin-${weight}-normal.woff2`), path.join(out, `${family}-latin-${weight}-normal.woff2`));
    await cp(path.join(pkg, 'LICENSE'), path.join(out, `${family}-LICENSE`));
  }
  const faces = await mandarinFaces();
  await Promise.all(faces.map(face => cp(path.join(tcRoot, 'files', face.file), path.join(out, face.file))));
  await cp(path.join(tcRoot, 'LICENSE'), path.join(out, 'noto-sans-tc-LICENSE'));
  return faces.map(face => face.block.replaceAll('./files/', 'assets/fonts/')).join('\n');
}

function covers(range, codepoint) {
  return range.split(',').some(part => {
    const [start, end = start] = part.trim().replace(/^U\+/i, '').split('-');
    const lower = parseInt(start.replaceAll('?', '0'), 16);
    const upper = parseInt(end.replaceAll('?', 'f'), 16);
    return codepoint >= lower && codepoint <= upper;
  });
}

export async function diagramFonts(text) {
  const codepoints = [...new Set([...text].map(char => char.codePointAt(0)))];
  const faces = (await mandarinFaces()).filter(face => codepoints.some(codepoint => covers(face.unicodeRange, codepoint)));
  const roboto = path.dirname(require.resolve('@fontsource/roboto/package.json'));
  const latin = await readFile(path.join(roboto, 'files/roboto-latin-400-normal.woff2'));
  const fonts = [{ family: 'RAS Sans', weight: '400', unicodeRange: 'U+0-10FFFF', source: `url(data:font/woff2;base64,${latin.toString('base64')})` }];
  for (const face of faces) {
    const bytes = await readFile(path.join(tcRoot, 'files', face.file));
    fonts.push({ family: face.family, weight: face.weight, unicodeRange: face.unicodeRange, source: `url(data:font/woff2;base64,${bytes.toString('base64')})` });
  }
  return {
    fonts,
    css: fonts.map(font => `@font-face{font-family:'${font.family}';font-weight:${font.weight};src:${font.source} format('woff2');unicode-range:${font.unicodeRange}}`).join('\n'),
  };
}
