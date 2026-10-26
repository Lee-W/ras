# RAS workflow

RAS means **RAISE A SLIDE**. It creates a presentation for a speaker, audience,
and occasion. Marp Markdown is the editable source. Conversation language and
register follow the shared [collaboration voice](voice.md).

Resolve the plugin root from the skill file's location. All scripts and templates
are relative to that root. Work on the target deck, never on plugin templates when
the user asks to change a talk. Only use the user's supplied project context
and sources.

Read [project memory](memory.md) for accepted preferences in the selected deck.
Use relevant entries within the current brief; do not load unrelated personal
stores. `remember` and `retro` use that reference's dedicated flow.

## Where rules live

Each rule has one owning file. Other files link to the owner and keep only what
is particular to them: when the rule applies there, or a verdict that only that
operation gives. Change a rule in its owner, then check the links.

| Topic | Owner |
| --- | --- |
| Operation flow, roles, handoffs, and referring to slides | this file |
| Review criteria, review records, and source/context hashes | [review and verification](review.md) |
| Marp source conventions and layout mechanics | [Marp authoring](marp.md) |
| Image rights, evidence, and credits | [image rights and credits](image-rights.md) |
| Project memory, the profile layer, and retrospectives | [project memory](memory.md) |
| Conversation voice and language | [collaboration voice](voice.md) |

A speaker's own preferences belong in their profile, not in these shared files.

## Roles

Read `roles/chu2.md` for coordination, `roles/layer.md` for writing,
`roles/pareo.md` for design, `roles/lock.md` for implementation, and
`roles/masking.md` for review when that responsibility is relevant.

Each deck file has exactly one owner. Other roles hand their contribution to
that owner instead of editing the file themselves.

| Role | Owns | Deliverable | Done when |
| --- | --- | --- | --- |
| 🎧 CHU² | `brief.md` | The brief | Audience, one-sentence takeaway, duration, and venue constraints are all stated |
| 🎤 LAYER | `outline.md`, `sources.md` | The outline in the [outline template](../templates/outline.md), including each slide's `layout:` field; slide text and notes handed to LOCK for `slides.md`; source entries | Every slide has one purpose; every claim and image traces to a source entry |
| 🎹 PAREO | `theme.css` | The `theme.css` change; the value of each slide's `layout:` field, which LAYER records in `outline.md`; image entries, which LAYER records in `sources.md` | Layout decisions are written down before rendering, so LOCK and MASKING can compare the render against them |
| 🎸 LOCK | `slides.md`, build output (`dist/`, `.ras/` build and check files) | Source hash, report paths, and the commands actually run with their outcomes | The deck builds from source with the reported commands |
| 🥁 MASKING | `review.md` (optional human-readable notes), `.ras/reviews.json` (authoritative) | Records written with `review:record` | Every finding has a page heading, impact, and fix; rendered-page inspection and the image-rights audit are recorded |

Rendered-page inspection and the image-rights audit belong to MASKING only.
PAREO's layout decisions are the criteria MASKING checks the render against.

These are responsibilities, not five mandatory model calls. Follow the host's
delegation policy; perform them in the current agent when delegation is unavailable
or unnecessary. Do not invent agent runs or select a model that the host lacks.
The workflow supports Codex, Claude Code, and tool-capable open models. No role
requires a particular model vendor or API. In a chat-only host, return clearly
labelled draft file contents and execution steps; do not claim local actions or
visual checks. `scripts/ras.mjs prompt <operation> [--profile <path>] <request>` expands the
instructions that operation uses for hosts without plugin or skill discovery.

Read the shared collaboration voice before the opening and the active role file
before its pass. Keep that role's observation and response in visible handoffs,
including when one agent performs successive passes. The role files contain
original voice examples, not quotations from the franchise.
RAS is an unofficial fan-inspired tool with no franchise affiliation or endorsement;
see [rights and affiliation](../NOTICE.md). Do not add official dialogue or artwork
to the tool or imply that the software licence grants third-party character rights.
Character theming applies to collaboration; slide branding comes from the chosen
theme. The collaboration voice defines plain output and artifact-format boundaries.

## Operation flow and handoffs

| Operation | Working sequence | Completion |
| --- | --- | --- |
| create | CHU² briefs → LAYER shapes the story → PAREO designs → LOCK builds → MASKING inspects and reviews → CHU² delivers | Current source, rendered artifacts, and review evidence |
| create --plan | CHU² briefs → LAYER outlines, with PAREO's visual suggestions when useful | Outline, time budget, assumptions, missing sources |
| outline | CHU² clarifies the brief with the user → LAYER drafts and iterates the outline, with PAREO's visual suggestions when useful → user confirms | Confirmed `outline.md` (and `brief.md` if changed); no rendered slides; existing reviews become stale |
| revise | CHU² scopes the feedback → relevant writing/design pass → LOCK updates → MASKING rechecks | Requested changes and a review of the latest render |
| review | MASKING leads, consulting LAYER/PAREO criteria as needed | Findings and review status; editable source stays unchanged |
| export | LOCK builds/checks/exports → MASKING inspects or verifies a matching prior review → CHU² delivers | Artifacts plus actual verification status |
| remember | CHU² resolves the project and saves an authorized entry | Saved entry and path, or explicit pending persistence |
| retro | CHU² proposes grounded lessons → user selects → remember saves | Actual saved IDs and unresolved candidates |

Pass along the artifact paths, changed page headings, source hash when available,
decisions to preserve, checks actually performed, and unresolved findings. Use
`brief.md` and `outline.md` for intent, `sources.md` for evidence/provenance, and
`.ras/reviews.json` for review records, with optional notes in `review.md`.
Keep the artifacts in the deck.

For `NEEDS_CHANGES`, CHU² assigns each finding to the appropriate responsibility;
the next pass fixes it and LOCK rebuilds before MASKING checks the new result.
If the same finding survives two repair attempts, explain the attempted fixes
and the missing decision or capability instead of repeating an unchanged loop.
For `UNVERIFIED`, finish the available work and name the remaining checks without
calling the deck final. `READY` requires the review scope and evidence to be clear.

With one model, these are explicit successive passes, not an independent review
or a conversation among agents. If the host permits delegation, pass real
artifacts to real delegates and keep a single owner of each edited file, as in
the role table above. Do not fabricate handoffs, delegate replies, or parallel
execution. In chat-only mode, handoffs describe proposed content; rendering and
inspection remain pending.

## Inputs and decisions

Read the supplied brief, outline, material, and existing deck before asking
questions. Identify audience/prior knowledge, talk duration, central takeaway,
occasion/date, slide language, speaking language, and required template.
Ask only for consequential missing information. State low-risk assumptions and
continue. A supplied topic or outline is enough to start a draft.

When more than one deck could be the target (several deck directories are in
reach, or the request names none and no deck is active), ask which one before
reading or writing it; do not guess.

Keep `brief.md` as the evolving brief and `outline.md` as the narrative plan,
following the [outline template](../templates/outline.md). Refer to slides by
heading everywhere: in these files, `sources.md`, review findings and notes, and
replies to the speaker. A page number can accompany the heading as a convenience,
but it shifts when slides are added or split, and `slides.md` line numbers go
stale at once, so do not cite them. For `--plan`, stop after a
concrete outline in the template's format. For a request to make the slides,
continue through authoring, rendering, inspection, and fixes without requiring
another approval for each reversible step. `outline` differs from `--plan`: it
is a back-and-forth discussion that writes `outline.md` only after the user
confirms, while `--plan` produces one outline and stops.

## Authoring

- Write a talk with an opening, an argument, and a payoff. Each slide should
  have a clear job; transition slides, deliberate repetition, and silent image
  slides can all be meaningful.
- Preserve staged reveals across separate slides. A page count is not a time
  budget: a five-second statement and a two-minute code explanation differ.
- Put spoken explanations, pauses, transitions, and optional cuts in speaker
  notes. Put editorial history and verification detail in `sources.md` or
  `review.md`, not in the speaker's live cue sheet.
- Preserve a supplied author's voice. Do not invent anecdotes, audience
  reactions, quotations, performance measurements, or technical claims.
- For new time-sensitive technical claims, verify primary documentation or
  source code and record the version/date. Distinguish released behaviour,
  proposals, examples, and assumptions. Mark unresolved claims for review.
- Check every supplied or selected image under [image rights and credits](image-rights.md).
- On slides, write counts, quantities, and measurements as numerals (`3 retries`,
  `9 steps`, `1,163 tokens`), not as words. Numerals read faster from the back of a
  room. Pronouns such as "the one you already speak" stay words, and speaker notes
  may spell numbers out.
- When a slide title is too long for one line, break it on purpose with `<br>` at a
  phrase boundary (`` `AgentOperator`:<br>a budget across every attempt ``) rather
  than letting it wrap wherever the width runs out. An automatic wrap can strand a
  single word on the second line.
- The optional `profiles/wei.md` describes patterns observed in Wei's examples.
  Apply it when requested or clearly desired, not as universal presentation law.

## Tool workflow

Create an independent deck using:

```sh
node <plugin-root>/scripts/ras.mjs init <destination>
```

The initializer refuses to replace an existing destination. In the new deck:

```sh
npm ci
npm run doctor
npm run build
npm run check
npm run export
npm run preview
```

Run commands with that deck as the working directory. `npm ci` installs pinned
dependencies and Puppeteer's browser; dependency installation can need network
access. `RAS_BROWSER_PATH` can select an existing supported Chrome/Chromium.
When calling the Marp CLI by hand, pass `--no-stdin`; without it Marp waits for
stdin to close when stdin is an open pipe, which hangs non-interactive shells.
The RAS build already passes it.
By default `npm run export` stops when the layout check fails and writes no PDF.
Set `"allowExportOnCheckFailure": true` in `ras.config.json` to still produce
`dist/slides.pdf` for review while keeping the failure visible: `.ras/check.json`
and `dist/verification.json` keep `passed: false`, the machine status stays
`failed` (so `ready` is never true), a warning names the problem count, and the
command still exits 1. `just build` stops on that exit code, but the PDF is
already written.

To turn a finished deck into an article draft, run `npm run blog` in the deck.
It converts `slides.md` mechanically (no model, no network) into `blog/index.md`:
simple YAML frontmatter (title, date, optional description) plus plain Markdown.
Headings are re-levelled, `box` code blocks lose their `«…»` markers, directive
comments disappear, and speaker notes are kept as `<!-- note: … -->` comments after
their slide so they can guide the rewrite without being published as body text.
Raw HTML layouts such as `.columns` and every `.credit` are kept as they are; `hl`
frames are dropped with a warning. Referenced images are copied under the same
relative paths. An existing `index.md` is never replaced unless you pass `--force`
(only `index.md` and the images are overwritten); `--out <dir>` chooses another
folder. `--screenshots` puts a slide screenshot at the top of each section instead
of the original images: it reuses current `npm run check` previews, otherwise it
runs `check` first, which rebuilds `dist/` and removes any earlier PDF.
The result is a draft. Conversion is not factual or visual review, and image
permissions in `sources.md` were obtained for the presentation, so confirm them
again before publishing the article.

Read `references/marp.md` for the source conventions and `references/review.md`
for the verification contract. Generated projects carry their own tools and lockfile;
they build independently of the AI host.

To bring an existing deck's kit up to the current RAS version, run:

```sh
node <plugin-root>/scripts/ras.mjs upgrade <deck>          # report only
node <plugin-root>/scripts/ras.mjs upgrade <deck> --yes    # apply
```

Upgrade replaces only generated tool files (`scripts/`, `package.json`,
`package-lock.json`, `justfile`, `licenses/`, `README.md`, copied guides), backs
up every replaced file to `.ras/upgrade-backup-<timestamp>/`, and adds missing
keys to `ras.config.json` and missing rules to `.gitignore` without changing
existing ones. `package.json` is merged rather than replaced: RAS sets its
scripts, `engines`, `type`, `overrides`, `version`, and the versions of its own
dependencies, while dependencies, scripts, and top-level fields you added stay.
If the deck has extra dependencies, `package-lock.json` is left alone and the
output asks you to run `npm install`. An old `.ras/` rule in `.gitignore` is
replaced by `.ras/*` plus re-includes for `reviews.json` and `memory.json`. It never changes slides, briefs, outlines, sources, reviews,
theme, assets, or other files. Afterwards run `npm ci` (or `npm install` when the output says so) if the package files
changed, then `npm run export`.

Use `upgrade` rather than hand-copying kit files from a freshly initialized deck.
Confirm the result with `npm run export` exiting 0. A patch-level RAS bump may
change nothing but the version strings in `package.json` and `package-lock.json`.

Keep each talk's project in the user's own deck repository or folder, one
directory per talk (for example `decks/<YYYY-MM>-<topic>/source/`, with the
whole RAS project inside), not under the repository of the software the talk is
about. Run `init` straight into that location and keep planning notes in a
`planning/` folder inside the project. Generated output (`dist/`, PDF) is not
committed. Committing and pushing remain the user's decision.

## Delivery

Inspect the latest rendered pages. Fix faults in the source or theme, rebuild,
and verify the changed result. If a full final inspection was not possible,
report that limit explicitly. A machine check is not a visual or factual review.
Use `npm run status` to check freshness of recorded reviews. Follow the review
contract to record observations; never mark an unperformed review as passed.

Deliver links to `slides.md`, `dist/index.html`, `dist/slides.pdf`, and the
verification report. Summarize what changed, checks actually performed, missing
inputs, and rehearsal/timing uncertainty. Rendering does not measure a live talk.
Publishing or sending slides is a separate user instruction.
