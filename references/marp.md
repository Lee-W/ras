# Marp authoring contract

Use `slides.md` with YAML frontmatter and `---` between slides. Repeated `#`
headings are normal in slide Markdown. Do not apply blog heading or metadata rules.
Use Marp's parser to count slides, not a regex for horizontal rules: frontmatter,
code fences, notes, and thematic rules must be interpreted correctly.

```markdown
---
marp: true
theme: ras
size: 16:9
paginate: true
title: My talk
---

<!-- _class: statement -->
# One idea.

<!-- Pause here. Ask the audience for an example. -->

---

<!-- _class: image -->
![An informative description](assets/example.png)
```

Available theme classes: `title`, `section`, `statement`, `image`, `code`,
`compare`, and `closing`. A slide without a class is a heading plus body.
Use `_class` to keep a class on one slide. `class` persists to later slides.
Themes are CSS files with `/* @theme ras */`; the project owns `theme.css`.

Use `.accent` for coloured emphasis, `.muted` for secondary text, `.credit`
for image credits, `.label` for small diagram or box labels that may sit
below the body text size (checked against `minCreditSize`), and `.columns`
for a two-column comparison. Raw HTML is
enabled for these known local layouts. Ordinary prose, lists, tables, and code
remain Markdown. Prefer a shorter sentence or split slide to shrinking fonts.
Do not introduce a new colour-token or metadata grammar.

Credit wording and placement follow [image rights and credits](image-rights.md);
on the slide, set the credit in `.credit`.

HTML comments become presenter notes unless Marp recognizes them as directives.
Keep note comments free of `-->`. Use fenced code for examples containing HTML
comment syntax. Notes must be associated with the correct page after edits.

Mermaid fences are compiled to local SVG during build, using the pinned Mermaid
CLI and browser. SVG is embedded through an ordinary image reference in the
generated source. Keep the fence in editable `slides.md`. Existing SVGs and
screenshots go in `assets/`. Plain ASCII diagrams use `text` fences; coloured
ones can use escaped `<pre class="ascii">` with colour spans.

Local media lives under `assets/`; filenames with spaces must use valid Markdown
URL escaping or angle brackets. Pinned Latin fonts and Noto Sans TC Variable are
copied at build time, with their licences. The starter theme uses `RAS CJK` as
the fallback for Taiwanese Mandarin body text, headings, and code comments. Mermaid labels
load these fonts before layout and embed the needed subsets in their SVGs.
For other scripts or custom branding, supply fonts and their licences under
`assets/`, declare them in `theme.css`, and inspect the actual rendering.
Use local resources for presentation-critical media and fonts. HTTP links to
sources are fine; remote render-time resources are caught by the offline check.

The first version builds HTML, PDF, notes, and PNG previews. It does not promise
editable PowerPoint output or generic lossless HTML-to-Marp conversion.

## Reference conversion

For a requested sample conversion, read the original source and screenshots.
Preserve text, reveal order, notes, code, image credits, and intended hierarchy.
Keep a page mapping in `sources.md`. Report outdated claims separately instead
of silently rewriting them as part of a format conversion.

For Wei's legacy format, map `layout:` to `_class`, `::: notes` to comments,
`{br}` to `<br>`, and colour tokens to spans. Fenced `html` in the legacy builder
was rendered as HTML; it needs explicit conversion, not a verbatim code fence.
Preserve blank-headline pages. Recreate only layout-specific wrappers in Marp.

Some legacy projects keep a whole deck in one Markdown file, split into slides by
`## ` headings, with speaker notes as plain text. A markdown formatter or linter
can silently corrupt such a file: a note line that begins with `#` (for example a
PR number such as `#65451.` that wrapped onto its own line) is read as a heading,
and the formatter then demotes every later `## ` to `### `. The splitter, which
matches only `^## `, merges those slides into the previous one, yet the build
still reports success with far fewer slides. Such a file has no legitimate
third-level heading, so detect it with `grep "^### " <file>`: any hit means
damage, and a slide-count check alone will not notice. Repair by promoting every
`### ` back to `## ` and rejoining the stray `#NNNN` onto the preceding line. If
trailing punctuation (`?`, `.`, `!`) is still present, the formatter's
trailing-punctuation rule (MD026) did not run and the level shift is fully
recoverable. Two other known formatter damages are MD026 stripping a heading's
trailing punctuation (not recoverable) and MD009 stripping a bare `##`. Make the
splitter refuse to build when it sees any `^### `. In converted RAS `slides.md`,
notes live in HTML comments, which formatters leave alone.

## Highlighting code

To frame the part of a code block that a slide teaches, add the word `box` to
the fence and wrap the part in `«` and `»`:

````markdown
```python box
result = «fetch(url, retries=3)»
```
````

The build removes the markers, lets Marp colour the code as usual, and puts the
frame back around the marked characters. Highlight colours are kept, and the
`<pre>` still scales down when the code is wide. Only fences with the word `box`
in the info string are touched; every other fence renders exactly as before.
Raw `<mark>` inside `<pre>` is no longer needed.

- A range on one line becomes an inline frame, `<mark class="box">`, around just
  that text, such as a whole call or one `retries=3`.
- A range that crosses a line break becomes a block frame,
  `<span class="box-block">`, around whole lines, from the first line's start to
  the last line's end. The block is drawn with an outline, which takes no space,
  so no line of code moves when the frame is added.
- Several ranges per block are fine. Ranges must not nest.
- To show a literal `«` or `»` inside a `box` fence, double it: `««` and `»»`.
  Markers are read left to right and a doubled character is always the
  literal, so `«x»»` is not a range closed after `x`; put a space or another
  character between a marker and a literal of the same kind.
- An unclosed `«`, a stray `»`, a nested `«` and an empty `«»` stop the build
  with `Box code block at source line N (first line: "…")` and the reason.

The frame colour is `var(--accent)` with a `#ffb32d` fallback, from the kit
styles (`scripts/kit.css`). The build appends them after `theme.css`, so
`ras upgrade` delivers them, and the engine, to existing decks without touching
their own theme. A rule in `theme.css` for the same selector is harmless.

To frame a region of a screenshot, put the image in `<span class="hlin">` and
add one `<span class="hl">` per frame, positioned in percentages of the image:

```html
<span class="hlin"><img src="assets/dashboard.png" alt="Dashboard" width="900"><span class="hl" style="left:12%;top:30%;width:25%;height:8%"></span></span>
```

Measure the region in the image's own pixels with any viewer or editor, then
divide: `left` = x / image width, `top` = y / image height, `width` and `height`
likewise, each times 100. Do not reuse `.shot`, which is the theme's screenshot
placeholder box. Check the rendered page: a frame that misses its target is
only visible there.
