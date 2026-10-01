# RAS workflow

RAS means **RAISE A SLIDE**. It creates a presentation for a speaker, audience,
and occasion. Marp Markdown is the editable source. Follow the shared
[collaboration voice](../skills/orchestrator-voice/SKILL.md): default to Taiwanese
Mandarin (臺灣華語) for the conversation, while keeping slide language and spoken
language separate. An explicit conversation-language request takes precedence.

Resolve the plugin root from the skill file's location. All scripts and templates
are relative to that root. Work on the target deck, never on plugin templates when
the user asks to change a talk. Only use the user's supplied project context
and sources.

Read [project memory](memory.md) for accepted preferences in the selected deck.
Use relevant entries within the current brief; do not load unrelated personal
stores. `remember` and `retro` use that reference's dedicated flow.

## Roles

Read `agents/chu2.md` for coordination, `agents/layer.md` for writing,
`agents/pareo.md` for design, `agents/lock.md` for implementation, and
`agents/masking.md` for review when that responsibility is relevant.
These are responsibilities, not five mandatory model calls. Follow the host's
delegation policy; perform them in the current agent when delegation is unavailable
or unnecessary. Do not invent agent runs or select a model that the host lacks.
The workflow supports Codex, Claude Code, and tool-capable open models. No role
requires a particular model vendor or API. In a chat-only host, return clearly
labelled draft file contents and execution steps; do not claim local actions or
visual checks. `scripts/ras.mjs prompt <operation> <request>` expands these same
instructions for hosts without plugin or skill discovery.

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
| create | CHU² briefs → LAYER shapes the story → PAREO designs → LOCK builds → PAREO inspects → MASKING reviews → CHU² delivers | Current source, rendered artifacts, and review evidence |
| create --plan | CHU² briefs → LAYER outlines, with PAREO's visual suggestions when useful | Outline, time budget, assumptions, missing sources |
| outline | CHU² clarifies the brief with the user → LAYER drafts and iterates the outline, with PAREO's visual suggestions when useful → user confirms | Confirmed `outline.md` (and `brief.md` if changed); no rendered slides; existing reviews become stale |
| revise | CHU² scopes the feedback → relevant writing/design pass → LOCK updates → MASKING rechecks | Requested changes and a review of the latest render |
| review | MASKING leads, consulting LAYER/PAREO criteria as needed | Findings and review status; editable source stays unchanged |
| export | LOCK builds/checks/exports → PAREO/MASKING inspect or verify a matching prior review → CHU² delivers | Artifacts plus actual verification status |
| remember | CHU² resolves the project and saves an authorized entry | Saved entry and path, or explicit pending persistence |
| retro | CHU² proposes grounded lessons → user selects → remember saves | Actual saved IDs and unresolved candidates |

Pass along the artifact paths, changed page headings, source hash when available,
decisions to preserve, checks actually performed, and unresolved findings. Use
`brief.md` and `outline.md` for intent, `sources.md` for evidence/provenance, and
`review.md` for findings and their resolution. Keep the artifacts in the deck.

For `NEEDS_CHANGES`, CHU² assigns each finding to the appropriate responsibility;
the next pass fixes it and LOCK rebuilds before MASKING checks the new result.
If the same finding survives two repair attempts, explain the attempted fixes
and the missing decision or capability instead of repeating an unchanged loop.
For `UNVERIFIED`, finish the available work and name the remaining checks without
calling the deck final. `READY` requires the review scope and evidence to be clear.

With one model, these are explicit successive passes, not an independent review
or a conversation among agents. If the host permits delegation, pass real
artifacts to real delegates and keep a single owner of each edited file. Do not
fabricate handoffs, delegate replies, or parallel execution. In chat-only mode,
handoffs describe proposed content; rendering and inspection remain pending.

## Inputs and decisions

Read the supplied brief, outline, material, and existing deck before asking
questions. Identify audience/prior knowledge, talk duration, central takeaway,
occasion/date, slide language, speaking language, and required template.
Ask only for consequential missing information. State low-risk assumptions and
continue. A supplied topic or outline is enough to start a draft.

Keep `brief.md` as the evolving brief and `outline.md` as the narrative plan.
For `--plan`, stop after a concrete outline with section purposes, approximate
time budget, visual opportunities, and missing sources. For a request to make
the slides, continue through authoring, rendering, inspection, and fixes without
requiring another approval for each reversible step. `outline` differs from
`--plan`: it is a back-and-forth discussion that writes `outline.md` only after
the user confirms, while `--plan` produces one outline and stops.

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
- Follow [image rights and credits](image-rights.md) for every supplied or selected
  image. Record use evidence and whether creator/rightsholder credits are required
  in `sources.md`; place required wording in the audience-visible slides.
  Missing images, unknown rights, or missing required credits keep the deck unready.
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
Read `references/marp.md` for the source conventions and `references/review.md`
for the verification contract. Generated projects carry their own tools and lockfile;
they build independently of the AI host.

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
