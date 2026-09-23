# Review and verification

Review content and visuals independently of successful compilation.

## Content review

Read the brief and complete deck, including notes. Check the core argument,
audience assumptions, transitions, code/claim consistency, source attribution,
and the payoff. Match the requested scope: review reports findings; create/revise
can fix them. Identify findings by heading plus page number from the latest build.

Speaker notes are for delivery, not internal editing history. Check their meaning,
not just their presence. Estimate section duration and suggest cuts; label estimates
as untested until the speaker rehearses. Do not impose a fixed slides-per-minute rule.

## Machine checks

`npm run check` builds the current source, opens all pages in a local browser,
blocks remote network resources, waits for fonts and images, and reports overflow,
clipped text, small body/code text, missing images, browser errors, and page-count
disagreement. It writes `.ras/check.json` and `.ras/previews/slide-NNN.png`.

`npm run export` requires the machine check, exports a PDF, checks the PDF page
count against Marp's count, and writes `dist/verification.json`. Presenter notes
are also written to `dist/notes.txt`. Notes are not added as PDF annotations.
The HTML presenter view includes notes; it is a speaker artifact, not a private
notes channel. Choose a PDF when sharing audience-only slides.

Do not modify generated HTML to repair layout. Do not weaken thresholds just to
make a failure disappear. Intentional full-bleed images are allowed; unexpected
text overlap/clipping still needs correction. Reports explicitly say visual review
and factual review are pending; automated checks cannot certify either.

## Visual checks

Inspect every final page as an image or in the browser; a contact sheet can guide
which pages need a closer look. Check hierarchy, whitespace, image crop, contrast,
wrapping, readable code/tables, diagrams and connectors, credits, consistent chrome,
and reveal sequences. Test slide navigation and presenter notes separately.

After changes, inspect the new rendering. During iteration, inspect affected
pages; before final delivery, cover the complete latest deck. Record the source
hash, reviewed pages, actual observations, and remaining findings in `review.md`.
Never report a previous render's review as evidence for a newer source hash.
