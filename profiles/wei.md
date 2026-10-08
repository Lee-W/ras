# Wei's presentation profile

Use this optional profile when Wei asks for his presentation style. These are
observed patterns, with authoring suggestions derived from them. The current
brief, audience, venue, and Wei's explicit choices take precedence.

## Reading basis and priority

Reviewed on 2026-10-05: the [SpeakerDeck collection](https://speakerdeck.com/leew)
contained 37 decks. Excluding the first three in its newest-first listing left
34 decks, 3,175 PDF pages, with upload dates from 2016 through 2025. The exclusions
were *Orchestration Still Matters: Apache Airflow in the Age of AI*,
*Asset Partitions: Matching Workflow to the Right Data*, and
*Your Al Is Only As Good As Your Data Pipeline*. They did not inform this profile.

The reading covered extracted text and a visual overview of every included PDF
page, with selected recent sequences enlarged. Image-only pages were included in
the visual reading. This is evidence about slides and their ordering; delivery,
animation, audience response, and actual talk duration were not reviewed.

Give recent examples greater influence using these relative editorial weights:

| Upload year | Weight |
| --- | ---: |
| 2025 | 1.00 |
| 2024 | 0.75 |
| 2023 | 0.50 |
| 2020 | 0.25 |
| 2019 | 0.20 |
| 2018 | 0.15 |
| 2017 | 0.10 |
| 2016 | 0.05 |

These weights express synthesis priority, not a statistical score or a measured
frequency. Upload dates need not equal presentation dates. Read repeated editions
individually, but treat them as one talk family when judging a recurring pattern.
The many *Python Table Manners* editions and the 293-page Flask course should not
outvote newer work through their page counts. Within the recent examples, choose
the talk closest to the new audience and purpose.

The complete inventory, per-deck observations, and reviewed PDF SHA-256 hashes
are retained in `references/wei-style-study.md` in the RAS source checkout.

## Narrative and pacing

- Write a sequence for a live speaker: a question, an example, an observation,
  a complication, and a payoff. Keep one conceptual beat per page. A beat can
  be one sentence, a single word, an image, a code focus, or a deliberate pause.
- Preserve successive reveals. Reusing the same title, code, diagram, or image
  while adding one detail or moving a highlight is a central pattern. Do not
  collapse these pages into a summary list or delete them as duplicates.
- Let the audience encounter the problem before supplying the whole solution.
  Openings often use a misconception, a provocative title, a familiar annoyance,
  or a question that anticipates the audience's objection.
- Keep a concrete problem running through the explanation. A small example can
  establish the mechanism; return to the actual project, pull request, or user
  interface to show why it matters. A failed attempt or a new limitation can
  motivate the next technique.
- Use short chapter dividers and reaction pages to change pace. Reserve a
  separate page for a reversal, a callback, or a line that needs time to land.
- Page count is a poor time budget. Many long decks contain rapid annotation
  changes and very short statements; some also include appendices and event
  promotions. Estimate time by explanation, demonstration, pauses, and rehearsal.

## Technical explanation

- Start with the smallest example that exposes the mechanism. Map code to its
  result or diagram, one relationship at a time. Keep their positions stable
  while changing the focus.
- Reveal code in explainable steps. Crop or enlarge the relevant section, mark
  the active line or node, and dim surrounding material when that helps. A full
  screenshot can establish context before a close view explains the detail.
- Use boxes, arrows, underlines, and local labels as attention cues. Matching
  marks can connect code and diagram. Red/orange boxes often mean “look here”;
  colour alone does not always mean an error or a warning.
- Make diagrams describe the actual relationship being discussed: a workflow,
  sequence, syntax tree, dependency, or before/after change. Choose an appropriate
  diagram tool for the new deck; the historical slides do not require Mermaid
  or ASCII as a particular implementation.
- Explain what something is, how the small example works, why the real project
  needs it, and where it stops helping. This can unfold across a sequence rather
  than fitting a fixed four-part slide template. Introduce unfamiliar names
  when needed; an intuitive example may precede the formal definition.
- Let screenshots and actual project artefacts substantiate the story. Keep
  technical sources and versions current when authoring a new talk; historical
  code, benchmarks, and product screenshots are not current technical guidance.

## Voice, humour, and emotional range

- Keep slide prose short, direct, and conversational. Questions, first/second
  person, brief asides, and a staged “but…” are recurring devices. Avoid expanding
  each visible line into a paragraph of everything the speaker will say.
- Humour is a frequent narrative device in recent public talks. Anime/manga
  panels, film memes, emoji, and reaction images can voice an objection, create
  a pause, carry a reversal, or recall an earlier joke. Choose the image for that
  job and for what this audience will understand.
- A running reference or metaphor can connect a whole talk. Use coherent
  callbacks when the material supports them; do not require a meme on every
  page or impose an arbitrary low humour quota.
- Self-deprecating framing often makes unfamiliar technical or community work
  approachable. Keep the explanation substantive and preserve its limitations.
  Do not invent personal failures, anecdotes, quotations, or audience reactions.
- Images can also carry sincerity. Recent community and travel talks move from
  playful references into belonging, encouragement, gratitude, or an invitation
  to participate. Leave room for that change of tone without adding a joke to
  every earnest statement.
- Slide language varies: English, traditional Chinese, and mixed technical
  vocabulary all appear. Choose it with the brief. Taiwanese Mandarin speaking
  notes can accompany English slides; neither language pairing is compulsory.

## Visual direction

- A common recent technical-talk frame is a black-to-muted-blue/grey-purple
  gradient, white text, generous empty space, and a dominant content block.
  Large centred statements alternate with a top heading above code, a diagram,
  or a screenshot. Text/image pairs and full reaction images are also common.
- Recent English display text often has a rounded, handwritten-looking,
  monospaced character; embedded PDF text frequently names `ComicMono-Bold`.
  Traditional Chinese commonly uses a clean sans serif. Describe and reproduce
  the readable character with available, appropriately licensed fonts rather
  than assuming a condensed font or installing a historical font globally.
- Use a restrained base palette with local emphasis. Amber/gold words, white
  underlines, red/orange or pink focus boxes, and cyan matching marks occur in
  different contexts. Keep each sequence's emphasis consistent; gold/cyan is
  not an obligatory two-colour theme.
- Keep secondary material quiet. A small personal-site footer and QR codes for
  slides, references, projects, or participation recur, but their destinations
  and the need for them belong to the individual talk.
- Adapt the frame to the subject and venue. The 2025 travel talk uses olive
  texture and cream paper panels; conference templates and a concise technical
  update use other typography and layouts. Dark backgrounds are a common option,
  not a requirement for every Wei presentation.

Wei's explicit preference (2026-10-07): numbers on slides are numerals, never
spelled-out English words, because digits are easier to read.
Also (2026-10-07): when a title is too long for one line, break it by hand with
`<br>` at a phrase boundary rather than letting it wrap.

Type scale (feedback from several rounds): take the baseline from Wei's own
previous deck, not from a general sense of how large slide text should be. Before
styling, scan that deck's `<style>` (for example
`grep -oE 'font-size:\s*[0-9]+px'`) and use the distribution as the bounds.
Wei's June 2026 conference deck used 140 / 190 / 260 / 360 / 540 / 600px, with hero
numbers at 260-360px. A theme built for dense tables and code (body and ASCII
blocks at about 23px, roughly 3% of slide height) applied to a one-idea-per-slide
deck drew "text too small" and "why so empty" comments in six separate messages;
fixing slides one by one could not help because the cause was the theme. Compute
the steps rather than guessing: content column width divided by the font's
advance (about 0.5em for sans, 0.6em for monospace) gives how many characters
each step holds. Keep the title at least 1.5 times the body size; closer sizes
read as one crowd of similar text. Cap the title on slides with a picture or code
block, or it crowds the content out.

Language label: in English-facing material (slides, notes, docs) call Wei's
language "Taiwanese Mandarin", never "Chinese", on any caption, label, or speaker
note. Text in the language itself uses traditional characters and Taiwan wording.

## Opening, introduction, and ending

- Do not force an agenda and full biography before the hook. Several recent
  technical talks place the biography after delivering substantial value;
  introductory, community, and update talks sometimes introduce the speaker
  earlier. Use only the credentials needed for this room.
- A terminal-style Python biography and a following syntax-error joke recur in
  several newer decks. They are an available callback, not a compulsory opening
  or permission to copy outdated employment and role details.
- End by returning to the original problem or title, giving the audience a
  useful next step, or inviting participation. Community talks often make that
  invitation concrete with a project, event, contribution, or QR code.
- Put spoken explanation, transitions, pauses, and optional cuts in notes.
  Keep research and editorial history in project documents. Preserve image
  provenance and required credits when selecting new assets; the reference
  decks' anime images, photos, logos, and fonts are not reusable RAS assets.

## Representative sequences to consult

Page numbers below are one-based PDF pages, including exported reveal states.
The interpretations concern presentation choices, not the technical claims.

| Source | Pages | What to carry into a new talk |
| --- | --- | --- |
| [觸發觸發器器 (2025)](https://speakerdeck.com/leew/chu-fa-chu-fa-qi-qi-na-ge-ni-ke-neng-bu-shou-de-apache-airflow-yuan-jian) | 33–46 | Alternate actual code and cropped sequence diagrams; move the audience's focus through the same process. |
| [Unlocking the Future of Data Pipeline (2025)](https://speakerdeck.com/leew/unlocking-the-future-of-data-pipeline-942ed56f-0083-4e25-9e30-04850095e824) | 9–14 | Match a small code example to workflow nodes and dependencies through successive highlights. |
| [Unleash the Chaos (2025)](https://speakerdeck.com/leew/unleash-the-chaos-developing-a-linter-for-un-pythonic-code-806b2bae-e161-4762-b0d5-d9fb8efdd24a) | 19–30; 64–88 | Explain a minimal AST gradually; let lost formatting and a later performance limitation motivate subsequent choices. |
| [開源菜雞的隨意雜談 (2025)](https://speakerdeck.com/leew/20251127-kai-yuan-cai-ji-de-sui-yi-za-tan) | 96–117 | Move from a personal/community story into sincere encouragement; split the closing thought across pages. |
| [Hold on! You have a data team in PyCon Taiwan! (2025)](https://speakerdeck.com/leew/hold-on-you-have-a-data-team-in-pycon-taiwan) | 1–90 | Use familiar film reactions and real community artefacts throughout a technical story. |
| [Unlocking Python's Core Magic (2024)](https://speakerdeck.com/leew/unlocking-pythons-core-magic) | 1–135 | Connect language mechanisms to practical project needs and revisit the limits of the explanation. |
| [Starts Airflow task execution directly from the triggerer (2024)](https://speakerdeck.com/leew/starts-airflow-task-execution-directly-from-the-triggerer) | 1–18 | Adapt the style to a compact technical update with a simpler typographic treatment. |
| [朝聖之路 (2025)](https://speakerdeck.com/leew/zhao-sheng-zhi-lu) | 1–182 | Let comparison images, travel photos, and a warmer paper/olive frame serve a personal subject. |

Older work helps explain continuity: the 2016–2017 paper presentations already
build examples and highlight formula components across pages; the 2018 Flask
course develops one application through problems, exercises, and fixes; the
2019–2020 tool talks use more agenda/bullet material while retaining progressive
annotation and humour. Use that history as supporting evidence, with the recent
and relevant examples guiding new work.
