# Wei's legacy deck format

Read this when converting one of Wei's decks from his earlier slide builder into
RAS `slides.md`. The general conversion rules (preserve text, reveal order, notes,
code, and credits; keep a page mapping in `sources.md`) are in
[Marp authoring](../references/marp.md#reference-conversion).

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
