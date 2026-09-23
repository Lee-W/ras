# RAS workflow

RAS means **RAISE A SLIDE**. It creates a presentation for a speaker, audience,
and occasion. Marp Markdown is the editable source. Use Traditional Chinese
with Taiwanese vocabulary when the user writes in Chinese; keep slide language
and spoken language separate.

Resolve the plugin root from the skill file's location. All scripts and templates
are relative to that root. Work on the target deck, never on plugin templates when
the user asks to change a talk. Only use the user's supplied project context
and sources.

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

Default to brief role-labelled progress updates, without impersonated quotes or
long theatrical narration. Honour a request for plain output. Character theming
applies to collaboration; slide branding comes from the talk's chosen theme.

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
requiring another approval for each reversible step.

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
- Keep image provenance in `sources.md` and visible credits where appropriate.
  Missing images remain explicit draft findings; do not call the deck final.
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

Deliver links to `slides.md`, `dist/index.html`, `dist/slides.pdf`, and the
verification report. Summarize what changed, checks actually performed, missing
inputs, and rehearsal/timing uncertainty. Rendering does not measure a live talk.
Publishing or sending slides is a separate user instruction.
