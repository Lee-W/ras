// Marp engine plugin: frame part of a code block with a box.
//
// Opt-in: only a fence whose info string contains the word `box` is changed
// (```python box). Inside it, «…» wraps the part to frame; «« and »» are the
// literal characters. Fences without `box` render exactly as Marp renders them.
//
// The markers are removed from the source first, the remaining text is
// highlighted by Marp's own highlighter, and the boxes are then inserted back
// by text offset, closing and reopening highlight spans so the HTML stays nested.

const OPEN = '«';
const CLOSE = '»';

// Strip markers; return the plain code and the [start, end) ranges to frame.
export function parseMarkers(source) {
  let text = '';
  let start = -1;
  const ranges = [];
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if ((char === OPEN || char === CLOSE) && source[index + 1] === char) { text += char; index++; continue; }
    if (char === OPEN) {
      if (start >= 0) throw new Error(`nested ${OPEN} before the previous ${OPEN} was closed with ${CLOSE}`);
      start = text.length;
    } else if (char === CLOSE) {
      if (start < 0) throw new Error(`${CLOSE} without a matching ${OPEN}`);
      if (text.length === start) throw new Error(`empty ${OPEN}${CLOSE} range`);
      ranges.push([start, text.length]);
      start = -1;
    } else text += char;
  }
  if (start >= 0) throw new Error(`${OPEN} is never closed with ${CLOSE}`);
  return { text, ranges };
}

// Single-line ranges become inline boxes; ranges that cross a newline become
// block boxes covering whole lines, trailing newline included. A block box has
// an inner .box-text span so kit.css can give the block the font of the pre (its line strut) and the
// text the code font; that keeps every line at the same height as outside the box.
function boxes(text, ranges) {
  const inline = [];
  const blocks = [];
  for (const [start, end] of ranges) {
    if (!text.slice(start, end).includes('\n')) { inline.push({ start, end, kind: 'inline' }); continue; }
    const first = text.lastIndexOf('\n', start - 1) + 1;
    const last = end - 1;
    let stop = text[last] === '\n' ? last + 1 : text.indexOf('\n', last) + 1;
    if (stop === 0) stop = text.length;
    blocks.push({ start: first, end: stop, kind: 'block' });
  }
  blocks.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const block of blocks) {
    const previous = merged.at(-1);
    if (previous && block.start < previous.end) previous.end = Math.max(previous.end, block.end);
    else merged.push({ ...block });
  }
  return [...merged, ...inline];
}

const TOKEN = /<span\b[^>]*>|<\/span>|&(?:#x?[0-9a-f]+|[a-z]+);|[\s\S]/giy;

// Insert boxes into highlighted HTML at plain-text offsets.
export function insertBoxes(html, text, ranges) {
  const list = boxes(text, ranges);
  const events = [];
  for (const box of list) {
    const [open, close] = box.kind === 'block'
      ? ['<span class="box-block"><span class="box-text">', '</span></span>']
      : ['<mark class="box">', '</mark>'];
    events.push({ at: box.start, order: box.kind === 'block' ? 0 : 1, open: true, box, tag: open, end: close });
    events.push({ at: box.end, order: box.kind === 'block' ? 1 : 0, open: false, box });
  }
  // At one offset: close boxes (inline first), then open boxes (block first).
  events.sort((a, b) => a.at - b.at || Number(a.open) - Number(b.open) || a.order - b.order);
  const stack = [];
  let output = '';
  let offset = 0;
  let next = 0;
  const reopen = removed => { for (const entry of removed.reverse()) { output += entry.tag; stack.push(entry); } };
  const closeDownTo = index => {
    const removed = stack.splice(index);
    for (const entry of [...removed].reverse()) output += entry.end;
    return removed;
  };
  const flush = () => {
    while (next < events.length && events[next].at <= offset) {
      const event = events[next++];
      if (event.open) {
        const entry = { box: event.box, tag: event.tag, end: event.end, isBox: true };
        let floor = stack.length;
        while (floor > 0 && !stack[floor - 1].isBox) floor--;
        const removed = closeDownTo(floor);
        output += entry.tag;
        stack.push(entry);
        reopen(removed);
      } else {
        const index = stack.findIndex(entry => entry.box === event.box);
        const removed = closeDownTo(index);
        removed.shift();
        reopen(removed);
      }
    }
  };
  TOKEN.lastIndex = 0;
  let match;
  while ((match = TOKEN.exec(html))) {
    const token = match[0];
    if (token === '</span>') {
      const top = stack.pop();
      if (!top || top.isBox) throw new Error('Unbalanced highlight markup');
      output += token;
    } else if (token.startsWith('<span')) {
      flush();
      stack.push({ tag: token, end: '</span>', isBox: false });
      output += token;
    } else {
      flush();
      output += token;
      offset += 1;
    }
  }
  flush();
  if (offset !== text.length) throw new Error(`Highlighted text has ${offset} characters; expected ${text.length}`);
  // Closing and reopening at a boundary can leave empty highlight spans.
  let previous;
  do { previous = output; output = output.replace(/<span class="hljs-[^"]*"><\/span>/g, ''); } while (output !== previous);
  return output;
}

export function boxPlugin(md) {
  const original = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const words = token.info.trim().split(/\s+/).filter(Boolean);
    if (!words.includes('box')) return original(tokens, index, options, env, self);
    const line = token.map ? token.map[0] + 1 : '?';
    let parsed;
    try { parsed = parseMarkers(token.content); } catch (error) {
      const first = token.content.split('\n', 1)[0];
      throw new Error(`Box code block at source line ${line} (first line: ${JSON.stringify(first)}): ${error.message}`);
    }
    const saved = { info: token.info, content: token.content, highlight: options.highlight };
    token.info = words.filter(word => word !== 'box').join(' ');
    token.content = parsed.text;
    options.highlight = (code, language, attributes) => {
      const highlighted = saved.highlight?.(code, language, attributes) || md.utils.escapeHtml(code);
      return insertBoxes(highlighted, parsed.text, parsed.ranges);
    };
    try { return original(tokens, index, options, env, self); } finally {
      token.info = saved.info;
      token.content = saved.content;
      options.highlight = saved.highlight;
    }
  };
}

// Functional engine for `marp --engine`: Marp CLI passes its prepared Marp Core.
export default ({ marp }) => marp.use(boxPlugin);
