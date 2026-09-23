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
for image credits, and `.columns` for a two-column comparison. Raw HTML is
enabled for these known local layouts. Ordinary prose, lists, tables, and code
remain Markdown. Prefer a shorter sentence or split slide to shrinking fonts.
Do not introduce a new colour-token or metadata grammar.

HTML comments become presenter notes unless Marp recognizes them as directives.
Keep note comments free of `-->`. Use fenced code for examples containing HTML
comment syntax. Notes must be associated with the correct page after edits.

Mermaid fences are compiled to local SVG during build, using the pinned Mermaid
CLI and browser. SVG is embedded through an ordinary image reference in the
generated source. Keep the fence in editable `slides.md`. Existing SVGs and
screenshots go in `assets/`. Plain ASCII diagrams use `text` fences; coloured
ones can use escaped `<pre class="ascii">` with colour spans.

Local media lives under `assets/`; filenames with spaces must use valid Markdown
URL escaping or angle brackets. Bundled Latin fonts are copied at build time.
Add any required CJK/custom fonts and their licences under `assets/`, declare
them in `theme.css`, and inspect their actual rendering on the target machine.
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
