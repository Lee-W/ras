#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { locales, pages, pageUrl, sourcePages, sharedSources } from './docs-pages.mjs';
import { docsStyle } from './docs-style.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
// Resolve through the installed tool that owns each locked dependency.
const marpRequire = createRequire(require.resolve('@marp-team/marp-core'));
const mermaidRequire = createRequire(require.resolve('@mermaid-js/mermaid-cli'));
const MarkdownIt = marpRequire('markdown-it');
const mermaidRoot = path.dirname(mermaidRequire.resolve('mermaid/dist/mermaid.esm.min.mjs'));
const md = new MarkdownIt({ html: false, linkify: true });
const escape = md.utils.escapeHtml;

function sharedUrl(locale, source) { return pageUrl(locale, `source/${source}`); }

function rewriteLink(href, source, locale) {
  if (/^http:\/\/127\.0\.0\.1:4174\/(?:en|zh-TW)\/$/.test(href)) return new URL(href).pathname;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) return href;
  const [pathname] = href.split(/[?#]/);
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(source), decodeURIComponent(pathname)));
  const mapped = sourcePages.get(target);
  if (mapped) return pageUrl(mapped.locale, mapped.page.slug) + href.slice(pathname.length);
  if (sharedSources.has(target)) return sharedUrl(locale, target) + href.slice(pathname.length);
  return href;
}

const fence = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, index, options, env, self) => tokens[index].info.trim() === 'mermaid'
  ? `<div class="diagram"><pre class="mermaid">${escape(tokens[index].content)}</pre></div>`
  : fence(tokens, index, options, env, self);
md.renderer.rules.table_open = () => '<div class="table-scroll"><table>\n';
md.renderer.rules.table_close = () => '</table></div>\n';

function renderMarkdown(source, file, locale) {
  // GitHub keeps its language row; the website uses the common header switcher.
  const text = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
    .replace(/^\[English\]\([^\n]+\) · \[臺灣華語(?: README)?\]\([^\n]+\)\r?\n/m, '');
  const tokens = md.parse(text, {});
  const outline = [];
  const ids = new Map();
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type === 'heading_open') {
      const title = (tokens[index + 1].children || []).filter(child => ['text', 'code_inline'].includes(child.type)).map(child => child.content).join('');
      const base = title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
      const count = ids.get(base) || 0;
      ids.set(base, count + 1);
      const id = count ? `${base}-${count}` : base;
      token.attrSet('id', id);
      if (['h2', 'h3'].includes(token.tag)) outline.push({ id, title, level: token.tag.slice(1) });
    }
    for (const child of token.children || []) {
      if (child.type === 'link_open') child.attrSet('href', rewriteLink(child.attrGet('href'), file, locale));
    }
  }
  return { html: md.renderer.render(tokens, md.options, {}), outline };
}

async function sourceText(file) {
  const actual = await realpath(path.join(root, file));
  if (!actual.startsWith(await realpath(root) + path.sep) || !(await stat(actual)).isFile()) throw new Error('Not found');
  return readFile(actual, 'utf8');
}

export async function renderDocsPage(locale, slug = '', shared = null) {
  const copy = locales[locale];
  const page = pages.find(page => page.slug === slug);
  if (!copy || (shared ? !sharedSources.has(shared) : !page)) throw new Error('Not found');
  const file = shared || page[locale][1];
  const source = await sourceText(file);
  const title = shared ? (/^# (.+)$/m.exec(source)?.[1] || copy.source) : page[locale][0];
  const rendered = renderMarkdown(source, file, locale);
  const alternate = language => shared ? sharedUrl(language, shared) : pageUrl(language, slug);
  const languages = Object.entries(locales).map(([language, strings]) => `<a href="${alternate(language)}" lang="${language}" hreflang="${language}"${language === locale ? ' aria-current="true"' : ''}>${strings.label}</a>`).join('');
  const sidebar = ['guide', 'maintenance'].map(group => `<h2>${copy[group]}</h2>${pages.filter(item => item.group === group).map(item => `<a href="${pageUrl(locale, item.slug)}"${!shared && item.slug === slug ? ' aria-current="page"' : ''}>${escape(item[locale][0])}</a>`).join('')}`).join('');
  const index = pages.indexOf(page);
  const pager = shared ? '' : [pages[index - 1], pages[index + 1]].map((item, direction) => item
    ? `<a href="${pageUrl(locale, item.slug)}"><small>${direction ? copy.next : copy.previous}</small>${escape(item[locale][0])}</a>` : '<span></span>').join('');
  const hash = createHash('sha256').update(source).digest('hex');
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)} · RAS ${copy.docs}</title><meta name="ras-source-hash" content="${hash}">
${Object.keys(locales).map(language => `<link rel="alternate" hreflang="${language}" href="${alternate(language)}">`).join('')}
<style>${docsStyle}</style></head><body>
<a class="skip" href="#content">${copy.skip}</a>
<header><a class="brand" href="${pageUrl(locale)}">RAS<span>RAISE A SLIDE · ${copy.docs}</span></a><nav class="languages" aria-label="${copy.language}">${languages}</nav></header>
<div class="layout"><aside class="sidebar"><details open><summary>${copy.navigation}</summary><nav aria-label="${copy.navigation}">${sidebar}</nav></details></aside>
<main id="content"><div class="eyebrow">${shared ? copy.source : copy[page.group]}</div>
${shared && copy.englishOnly ? `<p class="notice">${copy.englishOnly}</p>` : ''}
<article${shared ? ' lang="en"' : ''}>${rendered.html}</article><nav class="pager" aria-label="${copy.navigation}">${pager}</nav></main>
<aside class="outline" aria-label="${copy.outline}"><strong>${copy.outline}</strong>${rendered.outline.map(item => `<a class="level-${item.level}" href="#${escape(item.id)}">${escape(item.title)}</a>`).join('')}</aside></div>
<script>
const menu = document.querySelector('.sidebar details');
const mobile = matchMedia('(max-width: 800px)');
const updateMenu = () => { menu.open = !mobile.matches; };
mobile.addEventListener('change', updateMenu); updateMenu();
</script>
<script type="module">
import mermaid from '/_mermaid/mermaid.esm.min.mjs';
mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', fontFamily: '-apple-system, BlinkMacSystemFont, PingFang TC, sans-serif' });
for (const [index, node] of [...document.querySelectorAll('.mermaid')].entries()) {
  try {
    const { svg, bindFunctions } = await mermaid.render('diagram-' + index, node.textContent);
    node.innerHTML = svg;
    node.dataset.processed = 'true';
    bindFunctions?.(node);
  } catch {
    const error = document.createElement('p'); error.className = 'diagram-error'; error.textContent = ${JSON.stringify(copy.diagramError)}; node.before(error);
  }
}
</script></body></html>`;
}

export async function serveDocs({ port = 4174 } = {}) {
  const assetRoot = await realpath(mermaidRoot);
  const server = createServer(async (request, response) => {
    const send = (status, content, type = 'text/html; charset=utf-8', headers = {}) => {
      response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...headers });
      response.end(request.method === 'HEAD' ? undefined : content);
    };
    try {
      if (!['GET', 'HEAD'].includes(request.method)) { send(405, 'Method not allowed', 'text/plain', { Allow: 'GET, HEAD' }); return; }
      // Check before URL normalization can hide encoded directory traversal.
      const route = decodeURIComponent(request.url.split('?')[0]);
      if (!route.startsWith('/') || route.includes('\\') || route.includes('\0') || route.split('/').includes('..')) { send(404, 'Not found'); return; }
      if (route === '/') { send(302, '', 'text/plain', { Location: pageUrl('zh-TW') }); return; }
      if (route === '/favicon.ico') { send(204, ''); return; }
      const legacy = sourcePages.get(route.slice(1));
      if (legacy) { send(302, '', 'text/plain', { Location: pageUrl(legacy.locale, legacy.page.slug) }); return; }
      if (route.startsWith('/_mermaid/')) {
        const asset = await realpath(path.resolve(assetRoot, route.slice('/_mermaid/'.length)));
        if (!asset.startsWith(assetRoot + path.sep) || !asset.endsWith('.mjs') || !(await stat(asset)).isFile()) { send(404, 'Not found'); return; }
        send(200, await readFile(asset), 'text/javascript; charset=utf-8'); return;
      }
      const match = /^\/(zh-TW|en)(?:\/(.*))?$/.exec(route);
      if (!match) { send(404, 'Not found'); return; }
      const [, locale, slug] = match;
      if (slug === undefined) { send(302, '', 'text/plain', { Location: pageUrl(locale) }); return; }
      const shared = slug.startsWith('source/') ? slug.slice('source/'.length) : null;
      if (shared ? !sharedSources.has(shared) : !pages.some(page => page.slug === slug)) { send(404, 'Not found'); return; }
      send(200, await renderDocsPage(locale, slug, shared));
    } catch (error) {
      const invalid = error instanceof URIError || ['ENOENT', 'ENOTDIR'].includes(error.code) || error.message === 'Not found';
      if (!invalid) console.error(error);
      send(invalid ? 404 : 500, invalid ? 'Not found' : 'Unable to render documentation', 'text/plain; charset=utf-8');
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  try {
    const server = await serveDocs({ port: Number(process.env.PORT || 4174) });
    console.log(`RAS docs: http://127.0.0.1:${server.address().port}/zh-TW/ — Ctrl+C stops.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
