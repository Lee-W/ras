// Runs inside an unscaled, single-slide verification page.
export function probeSlide(config) {
  const slide = document.querySelector('section');
  if (!slide) return { problems: ['Slide section is missing'], title: '' };
  const frame = slide.getBoundingClientRect();
  const problems = [];
  const title = slide.querySelector('h1,h2')?.innerText.replace(/\s+/g, ' ').trim() || '(untitled)';
  const tolerance = 2;
  const outside = rect => rect.left < frame.left - tolerance || rect.right > frame.right + tolerance || rect.top < frame.top - tolerance || rect.bottom > frame.bottom + tolerance;
  for (const image of slide.querySelectorAll('img')) {
    if (!image.complete || image.naturalWidth === 0) problems.push(`Missing image: ${image.getAttribute('src')}`);
    if (!image.alt.trim()) problems.push('Image is missing descriptive alt text');
  }
  const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const text = walker.currentNode;
    if (!text.textContent.trim()) continue;
    const el = text.parentElement;
    if (el.closest('script,style,svg')) continue;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const range = document.createRange();
    range.selectNodeContents(text);
    const rects = [...range.getClientRects()].filter(r => r.width && r.height);
    const sample = text.textContent.trim().slice(0, 65);
    if (rects.some(outside)) problems.push(`Text leaves slide: ${sample}`);
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
  const fonts = [...document.fonts].filter(font => font.status === 'error').map(font => font.family);
  if (fonts.length) problems.push(`Fonts failed: ${fonts.join(', ')}`);
  return { title, problems: [...new Set(problems)] };
}
