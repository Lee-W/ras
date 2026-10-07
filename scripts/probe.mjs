// Runs inside an unscaled, single-slide verification page.
export function probeSlide(config) {
  const slide = document.querySelector('section');
  if (!slide) return { problems: ['Slide section is missing'], title: '' };
  const frame = slide.getBoundingClientRect();
  const slideStyle = getComputedStyle(slide);
  const inset = side => parseFloat(slideStyle[`padding${side}`]) + parseFloat(slideStyle[`border${side}Width`]);
  // Padding is the slide's safe margin: pagination, header, and footer live there.
  const content = { left: frame.left + inset('Left'), right: frame.right - inset('Right'), top: frame.top + inset('Top'), bottom: frame.bottom - inset('Bottom') };
  const problems = [];
  const title = slide.querySelector('h1,h2')?.innerText.replace(/\s+/g, ' ').trim() || '(untitled)';
  const tolerance = 2;
  const leaves = (rect, box, slackY = 0) => rect.left < box.left - tolerance || rect.right > box.right + tolerance || rect.top < box.top - tolerance - slackY || rect.bottom > box.bottom + tolerance + slackY;
  const outside = rect => leaves(rect, frame);
  // Marp wraps every slide in <svg data-marpit-svg><foreignObject>, so only
  // an SVG inside the slide marks diagram text to skip.
  const inSlide = (el, selector) => { const match = el.closest(selector); return Boolean(match && slide.contains(match) && match !== slide); };
  // Positioned layers (header, footer, overlays) and .bleed opt out of the content area.
  const placed = el => {
    for (let node = el; node && node !== slide; node = node.parentElement) {
      if (['absolute', 'fixed'].includes(getComputedStyle(node).position) || node.classList.contains('bleed')) return true;
    }
    return false;
  };
  for (const image of slide.querySelectorAll('img')) {
    if (!image.complete || image.naturalWidth === 0) problems.push(`Missing image: ${image.getAttribute('src')}`);
    if (!image.alt.trim()) problems.push('Image is missing descriptive alt text');
  }
  const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const text = walker.currentNode;
    if (!text.textContent.trim()) continue;
    const el = text.parentElement;
    if (inSlide(el, 'script,style,svg')) continue;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const range = document.createRange();
    range.selectNodeContents(text);
    const rects = [...range.getClientRects()].filter(r => r.width && r.height);
    const sample = text.textContent.trim().slice(0, 65);
    if (rects.some(outside)) problems.push(`Text leaves slide: ${sample}`);
    else if (!placed(el)) {
      // Glyph boxes may exceed a tight line-height by the half-leading.
      const lineHeight = parseFloat(style.lineHeight);
      if (rects.some(r => leaves(r, content, Number.isFinite(lineHeight) ? Math.max(0, (r.height - lineHeight) / 2) : r.height * 0.2))) problems.push(`Text leaves content area: ${sample}`);
    }
    const minimum = el.closest('.credit,footer,header') ? config.minCreditSize : el.closest('pre,code') ? config.minCodeSize : config.minTextSize;
    if (rects.length && parseFloat(style.fontSize) < minimum) problems.push(`Small text (${style.fontSize}, minimum ${minimum}px): ${sample}`);
    // A text fragment clipped by any ancestor is still a failure, even if its
    // outermost block remains inside the slide.
    for (let parent = el; parent && parent !== slide; parent = parent.parentElement) {
      const css = getComputedStyle(parent);
      const box = parent.getBoundingClientRect();
      const clipX = ['hidden', 'clip', 'scroll', 'auto'].includes(css.overflowX);
      const clipY = ['hidden', 'clip', 'scroll', 'auto'].includes(css.overflowY);
      if (rects.some(r => (clipX && (r.left < box.left - tolerance || r.right > box.right + tolerance)) || (clipY && (r.top < box.top - tolerance || r.bottom > box.bottom + tolerance)))) {
        problems.push(`Clipped text: ${sample}`); break;
      }
    }
  }
  for (const el of slide.querySelectorAll('pre,table,img')) {
    const rect = el.getBoundingClientRect();
    if (!el.closest('.bleed') && outside(rect)) problems.push(`${el.tagName.toLowerCase()} leaves slide`);
  }
  // Boxes catch flex and grid children pushed past the content area, including
  // borders and backgrounds without text. Report the outermost offender only.
  const replaced = new Set(['IMG', 'SVG', 'VIDEO', 'CANVAS', 'IFRAME', 'OBJECT']);
  const overflowing = new Set();
  for (const el of slide.querySelectorAll('*')) {
    if (inSlide(el.parentElement, 'svg') || placed(el)) continue;
    const css = getComputedStyle(el);
    if (css.visibility === 'hidden' || (css.display.startsWith('inline') && css.display !== 'inline-block' && !replaced.has(el.tagName.toUpperCase()))) continue;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height || !leaves(rect, content)) continue;
    overflowing.add(el);
    let nested = false;
    for (let node = el.parentElement; node && node !== slide && !nested; node = node.parentElement) nested = overflowing.has(node);
    if (nested) continue;
    const name = el.tagName.toLowerCase() + [...el.classList].map(name => `.${name}`).join('');
    const label = (el.innerText || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 65);
    problems.push(`${name} leaves content area${label ? `: ${label}` : ''}`);
  }
  const fonts = [...document.fonts].filter(font => font.status === 'error').map(font => font.family);
  if (fonts.length) problems.push(`Fonts failed: ${fonts.join(', ')}`);
  return { title, problems: [...new Set(problems)] };
}
