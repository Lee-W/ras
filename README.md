# RAS — RAISE A SLIDE

Turn a topic or outline into a presentation you can rehearse and deliver.
RAS is an independent AI plugin plus a portable Marp project kit, inspired by
RAISE A SUILEN. Each generated presentation is a self-contained project.

## What it does

- Create a narrative outline, slide text, and speaker notes from a brief.
- Revise an existing talk while preserving its voice and reveal sequence.
- Build HTML, export PDF/notes, and render every page for inspection.
- Check slide counts, local resources, font loading, text size, overflow, and clipping.
- Keep facts and asset provenance separate from rehearsal cues.

The AI host supplies the model and tools. The JavaScript scripts build and verify
slides; they do not call an AI API. The plugin's creative workflow requires an
AI host, while an exported project builds on its own.

## Start a standalone deck

Requires Node.js 22.18+ and npm. From this repository:

```sh
node scripts/ras.mjs init ../my-talk
cd ../my-talk
npm ci
npm run doctor
npm run export
npm run preview
```

Edit `brief.md`, `slides.md`, `sources.md`, and `theme.css`. The initial deck is
a runnable ten-page example, **Give one idea a stage**. Replace it with your talk.
The generator copies the build tools and exact dependency lockfile into the new
project. The project remains usable after moving it away from this repository.

The install needs network access for npm dependencies and Puppeteer's browser.
If the browser was not installed, run `npx puppeteer browsers install chrome`.
Alternatively set `RAS_BROWSER_PATH` to a Chrome/Chromium executable. Once installed,
builds use local fonts, images, and pre-rendered Mermaid diagrams.

| Command | Result |
| --- | --- |
| `npm run build` | HTML and notes in `dist/` |
| `npm run check` | Fresh build, automated checks, PNG previews |
| `npm run export` | Checks, then PDF with verified page count |
| `npm run preview` | Local preview at `http://127.0.0.1:4173` |
| `npm run doctor` | Node/browser/config diagnosis |
| `npm run status` | Current machine/review states and stale evidence |
| `npm run review:record -- <review.json>` | Record an actual visual or factual review |
| `npm run memory -- list` | Read the selected project's saved preferences |

`dist/` is generated output and is replaced on every build. Keep source assets
in `assets/`, not in `dist/`. The preview serves `dist/`; rebuild after edits and refresh the page. Set `PORT`
for a different local port. Marp HTML supports keyboard navigation and presenter
view. HTML contains speaker notes; PDF is the audience-only handout.

## Use with Codex, Claude Code, or open models

All entry points read the same skills and workflow. Model selection belongs to
the host; RAS has no vendor API key or model requirement. A model needs file/shell
tools to complete the whole production flow. Plain chat can draft the files;
rendering and verification then happen through the standalone JavaScript tools.

### Claude Code

Load this repository as a local plugin:

```sh
claude --plugin-dir /path/to/ras
```

Then use `/ras:create`, `/ras:revise`, `/ras:review`, `/ras:export`,
`/ras:remember`, or `/ras:retro`.
Each operation is a shared skill, so no separate command definitions are needed.
Claude Code [automatically scans the plugin's `skills/` directory](https://code.claude.com/docs/en/plugins-reference#skills);
the Claude manifest does not need a `skills` field. The `skills` and `interface`
fields in this repository belong to `.codex-plugin/plugin.json`.

### Codex

The repository includes a portable `plugin.json` and a compatible
`.codex-plugin/plugin.json` for plugin packaging. For immediate local use, install
the project skill bundle described below, or point Codex directly to the operation
skill. Creating this repository does not automatically install it in Codex.

For a project-local skills fallback, copy `SKILL.md`, `skills/`, `references/`, `agents/`,
`profiles/`, `templates/`, `scripts/`, the package manifests, and `.gitignore` together
under the project's `.agents/skills/ras/`, and start a new session. Preserve this
bundle's relative paths; copying a `SKILL.md` alone loses its supporting files.

Use natural language or the model-side router:

```text
ras:create brief.md
ras:create Explain retry policies to junior engineers in 15 minutes --plan
ras:revise talks/retries/slides.md Shorten the opening to two minutes
ras:review talks/retries/slides.md
ras:export talks/retries/slides.md
ras:remember In talks/retries, introduce the problem before showing code
ras:retro Review this session for reusable lessons in talks/retries
```

Host command discovery varies. The router does not register native slash commands
or promise autocomplete. You can also point the AI directly to the relevant
`skills/<operation>/SKILL.md` in this repository.

### Open models and hosts without plugin discovery

Export a complete prompt, with the selected skill, shared rules, and role
instructions expanded from their source files. This needs only Node.js:

```sh
node /path/to/ras/scripts/ras.mjs prompt create \
  'Explain retries to junior engineers in 15 minutes. Create ./talk.' > ras-request.md
```

For **direct Ollama / local chat**, use explicit chat mode:

```sh
node /path/to/ras/scripts/ras.mjs prompt create --chat \
  'Explain retries to junior engineers in 15 minutes.' > ras-chat.md
ollama run YOUR_MODEL < ras-chat.md
```

You can also paste `ras-chat.md` into a local chat interface. Supply the contents
of any brief/source files that the model cannot read. Save its labelled drafts
into a deck created with `init`, then run `npm run export`. Chat mode explicitly
returns file contents and commands; it cannot write files, browse sources, inspect
images, or export on its own. `prompt revise`, `prompt review`, `prompt export`,
`prompt remember`, and `prompt retro` expand the matching shared operations;
`--plan` remains plan-only for creation. Memory prompts in chat mode propose
entries and saving steps without claiming to persist them.

For a tool-capable model through Codex's local provider instead:

```sh
codex exec --oss --local-provider ollama -m YOUR_MODEL \
  --sandbox workspace-write --skip-git-repo-check - < ras-request.md
```

Start the local provider and install a suitable model first. Codex also accepts
`--local-provider lmstudio`. RAS does not select/download a model or modify your
provider configuration. Models differ in tool use, context capacity, and writing
quality; this adapter does not certify every model.

## The production team

| Role | Responsibility |
| --- | --- |
| 🎧 CHU² | Decisive producer: brief, argument, coordination, completion |
| 🎤 LAYER | Calm writer: slide text, transitions, speaker notes |
| 🎹 PAREO | Bright, attentive designer: theme, hierarchy, visual inspection |
| 🎸 LOCK | Earnest implementer: Marp source, builds, concrete repairs |
| 🥁 MASKING | Direct, dependable reviewer: clarity, pacing, evidence |

Roles are responsibilities, not five compulsory agent calls. The host may execute
them sequentially. The speaker controls what the talk says. Character theming stays
in the collaboration; the slide theme is chosen per presentation.

Creation follows **CHU² → LAYER → PAREO → LOCK → visual inspection → MASKING →
CHU²**. Review findings return to the responsible role, then the changed deck is
rebuilt and rechecked. Each handoff carries artifact paths and actual evidence.
The [shared workflow](references/workflow.md) defines the shorter revision,
review, export, and plan-only routes. Role files provide distinct voices and
original example lines. Ask for plain output to omit the character labels and
mannerisms. A single model uses successive passes and reports that honestly.

The optional [Wei profile](profiles/wei.md) captures short sentences, large type,
progressive reveals, code/diagrams, and sparse humour from the reference decks.
Conference/company branding and personal artwork belong in individual projects.

## Quality and scope

Machine checks alone leave visual and factual review **pending**. Inspect the
latest PNGs and sources, then use `review:record` with the hashes captured before
review and actual page coverage/observations. `status` detects stale records when
source, brief, outline, or sources change. Export includes those states and stays
available for drafts. Live talk duration remains an estimate until rehearsed.
See [the review contract](references/review.md).

`ras:remember` saves an explicitly requested preference in the selected project's
ignored `.ras/memory.json`. `ras:retro` proposes lessons from the actual session
and saves the candidates the user selects. Relevant saved entries guide later
operations without overriding the current brief. No home-directory memory store
is read, and memories are not included in slide exports. See [project memory](references/memory.md).

First-version scope: new talks, revision, review, and HTML/PDF export. Legacy sample
conversions validate the style; bulk migration of the three old talks is deferred.
The starter theme bundles pinned Noto Sans TC Variable for Taiwanese Mandarin
written in traditional characters,
including headings and code comments. Mermaid embeds its label fonts. Other
scripts and custom branding can supply project-local fonts and licences.
See [Marp authoring](references/marp.md).

Repository source excludes historical slide excerpts, character artwork,
employer logos, third-party memes, and font files. Keep reference fixtures outside
this repository; dependencies and generated output are ignored.
Font packages are installed as dependencies and their notices are retained in
generated output. `npm run validate` checks staged blobs, tracked working copies,
and non-ignored untracked files against a source-path allowlist and requires
regular UTF-8 text files. Unknown formats/directories, binary content, and
symlinks are rejected, including unstaged edits to tracked files. Deleted working
copies are still checked through their indexed content. Without Git metadata,
source-file checks are explicitly reported as skipped; metadata and skill checks
still run. File provenance still needs review.

See [the first-version validation record](docs/validation.md) for executed checks
and the limits of model/host testing.

## Development

```sh
npm ci
npm run validate
npm test
npm run test:mutation
```

GitHub CI runs these checks plus a standalone starter export on Ubuntu/macOS
with Node 22.18.0 and 26.9.0. Pull requests run CI directly; pushes to `main` run
the same CI before the version/release job. Conventional Commits drive version
updates across the npm manifests and all three plugin manifests, a changelog,
and a GitHub Release. See [repository automation](docs/development.md) for setup,
local commands, and release permissions.

The scripts use project-relative paths and a configurable browser. Behavioural
tests cover source parsing, independent initialization, missing assets, and layout
failure detection. Browser tests require an installed Chrome/Chromium.

Dependency overrides pin patched `@xmldom/xmldom` and align `puppeteer-core` with
Puppeteer 25. See [dependency pins and CVE references](docs/dependencies.md).
Use the current generated reports as test evidence.

## References

- [Marp CLI](https://github.com/marp-team/marp-cli)
- [Marpit notes and rendering](https://github.com/marp-team/marpit/blob/main/docs/usage.md)
- [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli)
- [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins)
- [Claude Code plugins](https://code.claude.com/docs/en/plugins)
- [RAISE A SUILEN](https://bang-dream.com/artist/raise-a-suilen/)
