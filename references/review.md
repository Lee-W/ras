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
text overlap/clipping still needs correction. Visual and factual checks remain
pending until a reviewer records them; automated checks cannot certify either.

## Visual checks

Inspect every final page as an image or in the browser; a contact sheet can guide
which pages need a closer look. Check hierarchy, whitespace, image crop, contrast,
wrapping, readable code/tables, diagrams and connectors, credits, consistent chrome,
and reveal sequences. Test slide navigation and presenter notes separately.

After changes, inspect the new rendering. During iteration, inspect affected
pages; before final delivery, cover the complete latest deck. Record the source
hash, reviewed pages, actual observations, and remaining findings in `review.md`.
Never report a previous render's review as evidence for a newer source hash.

## Recording and checking freshness

Run `npm run status` in the deck. It reports the current `sourceHash` and
`contextHash`, machine-check freshness, each review's state, and `ready`.
It does not build, inspect, or mutate the deck. The source hash covers rendering
inputs. The context hash additionally covers `brief.md`, `outline.md`, and
`sources.md`, including their creation/deletion. A context change invalidates
both reviews because audience and venue changes can affect visual suitability.
It does not invalidate a machine check when rendered inputs are unchanged.

After actually reviewing the current render/content, prepare a JSON record under
`.ras/` using the hashes obtained **before** the review. Example shape:

```json
{
  "kind": "visual",
  "sourceHash": "<sourceHash from status before inspection>",
  "contextHash": "<contextHash from status before inspection>",
  "verdict": "passed",
  "reviewer": "Reviewer name or actual model/host used",
  "pages": [1, 2],
  "observations": "What was inspected, observed issues, and their resolution."
}
```

Use `kind: factual` for argument/source review and `verdict: needs_changes` for
required fixes. List every page for a passing review; partial inspection cannot
pass the whole deck. Replace the example page list and observations with actual
evidence. Keep detailed findings in `review.md` when useful.

```sh
npm run review:record -- .ras/visual-review.json
npm run status
```

The helper rejects outdated hashes, missing observations, invalid page ranges,
and a passing review without full page coverage. It stores accepted records in
`.ras/reviews.json`. States are `pending`, `passed`, `needs_changes`, `stale`, or
`invalid`; machine checks additionally use `failed`. `ready` requires a current
passing machine check and both current passing reviews. The records are reviewer
attestations, not proof that a person/model actually performed the work.

Export remains available for drafts. Its verification report reflects current
review status, and exporting never grants a visual/factual pass. Rebuilding does
not erase accepted records; changed source/context makes them stale. Older decks
without these helpers keep the manual review contract until explicitly upgraded.
