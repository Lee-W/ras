# Validation record

[English](validation.md) · [臺灣華語](validation-zh-tw.md)

## Public-release preparation — 2026-09-28

Checked the working changes based on `2da18661eaf6cdb3a817eeb9522912a3862c5116`
on macOS arm64, Node 26.10.0, npm 11.19.1:

- `npm run validate` and all 46 tests passed, including licence propagation,
  standalone guide links, portable image-rights instructions, and CLI execution
  through a symlinked installation directory. That last check caught and fixed
  silent CLI no-ops through macOS's `/tmp` alias.
- `npm run test:release` passed first-release, rerun, docs-only, and patch scenarios.
- A new source bundle outside the checkout initialized a deck through the CLI.
  The deck installed its own dependencies with `npm ci`, passed `doctor`, and
  exported ten pages using its own tools. The install audit reported zero known
  vulnerabilities. Existing locally cached Puppeteer Chrome was used; this was
  not a new machine or an empty browser cache.
- Both `RAS-LICENSE` and `RAS-NOTICE.md` survived into output byte-for-byte.
  The generated project uses `UNLICENSED` package metadata so it does not assign
  MIT terms to the speaker's own content. The copied RAS kit retains MIT terms.
- Codex CLI 0.157.1, in a fresh app-server process, discovered the project-local
  root skill and seven router/operation skills, all enabled, without discovery
  errors. Names were exposed as `ras:ras`, `ras:create`, etc. Claude Code 2.1.283
  validated the manifest and loaded seven skills and five roles via `--plugin-dir`
  in a new process. These establish discovery, not model-generated presentation
  quality or a complete creative conversation in either host. No global install
  or model invocation was performed by these host checks.
- Chromium screenshots were inspected for both languages' README, workflow,
  authoring, review and image-rights pages, plus the licence and rights notice.
  The new guide was also inspected at 390px width. Local links resolved; no page
  overflow or Mermaid errors were reported. The in-app browser was unavailable,
  so screenshots came from the existing Puppeteer toolchain. Screenshots and the
  per-page source-hash manifest remain local fixtures outside this repository.

The standalone export's source hash was
`d5f994f8eed2466083fb88f69edf0753cba935ebdd9ae6ec019134637d9d2332`.
Its visual/factual review states were left pending: a successful export is not a
recorded slide review. The reviewed image-rights document source hashes were
`4bd8801a8529f2747ca3c1a771de20a2543e9c78980f2cb2d7b6110d284130c9` (English) and
`02f06b0caa44c296b76d373a158bd40a1f3b4f499bf0f05ede1d203613513859` (Taiwanese Mandarin).

The history inventory covered all 12 locally reachable commits and 136 distinct
file blobs at the baseline, including historical role and template text. It found
no bundled binary media, historical deck excerpts, official dialogue/lyrics, or
vendored fonts requiring removal. Data-URI matches were runtime font encoding
and an intentionally broken test image, not embedded asset copies. No history
rewrite or release deletion was indicated by this review. Names and franchise
references remain subject to the [rights notice](../NOTICE.md); this inventory
does not establish ownership of every text or grant third-party rights.

## First-version validation

Validated locally on 2026-09-24: macOS arm64, Node 22.18.0 and 26.9.0,
pinned Chromium via Puppeteer 25.11.0. The Node 22.18.0 runtime was downloaded
from nodejs.org and checked against the official SHA-256 manifest.

- Plugin manifest validator and all six skill entries passed validation.
- Full test suite: 31 tests passed on each Node version (including three preview and seven source-policy subtests). Node 26.9.0 used `npm test`; Node 22.18.0 used the same test files with `node --test --test-reporter=tap tests/*.test.mjs`. Coverage includes portable prompts, parsing/notes, initialization, source hashes, layout/asset failures, playback, PDF verification, encoded path traversal, source-file policy for indexed/unstaged/untracked contents, mutation-runner error handling, copied font licenses, and configuration/browser/child-process errors.
- An independently initialized project outside the repository installed dependencies with `npm ci`. Full starter-deck export, including Mermaid, HTML, notes, ten PNGs, and a ten-page PDF, passed on both Node versions using that project's own dependencies.
- All ten original starter-deck previews were visually inspected after the final theme changes. HTML/PNG counts and the actual PDF count agree.
- Reference fixtures and their media are not retained in this repository. Dependencies, fonts, and generated artifacts are excluded from Git. Repository templates contain original generic examples only.

The shared workflow has Codex/Claude Code manifests and a model-neutral prompt entry. Claude Code's [official plugin reference](https://code.claude.com/docs/en/plugins-reference#skills) confirms automatic discovery of the root `skills/` directory without a manifest `skills` field. The extra `skills`/`interface` fields are in `.codex-plugin/plugin.json`, not the portable root manifest. CLI syntax for Codex's local provider and Ollama was checked against installed CLI help. Plugin installation in new host sessions and real generation with a particular open model have not been exercised; prompt expansion and output generation are different checks. Direct Ollama uses explicit `--chat` mode and produces draft file contents for the user to save.

## Regression and mutation checks

The export test produces a real two-page PDF and asserts that `pdfPages` equals
both the slide count and the parsed PDF count. A second test injects a valid,
truncated PDF at the parsing boundary and requires rejection before
`verification.json` is written. The existing implementation already had this
ordering; no production export change was needed.

The preview test starts a server on an ephemeral port and sends raw HTTP request
paths. `/index.html` returns 200; `/%2e%2e%2fslides.md` and `/..%2fslides.md`
return 404. A plain `/../../../etc/passwd` path is unsuitable because URL
normalization can remove its traversal before the boundary check runs.

`npm run test:mutation` runs a passing baseline and two mutations in a temporary
copy created with `mkdtemp`. Each mutation starts from the original `deck.mjs`:

| Mutation | Expected failing assertion |
| --- | --- |
| Remove the PDF page-count comparison | The truncated-PDF test reports a missing rejection |
| Remove `startsWith(base + path.sep)` from the preview guard | Both encoded paths return 200 instead of 404 |

Both mutations were caught on Node 26.9.0. Before/after workspace snapshots check
SHA-256 contents, paths, file modes, and symlink targets for files selected by
`git ls-files --cached --others --exclude-standard -z`. This includes tracked
files and non-ignored untracked files, while omitting ignored local caches and
assets. Cleanup and the final snapshot are both attempted after a test failure.
A single error is rethrown unchanged; simultaneous test/cleanup/snapshot failures
are retained together in an `AggregateError`. Repository source was not mutated.
Changing `path.join` to `path.resolve` is not the tested mutation: the directory
boundary check is the relevant guard.

Three CLI regression tests deliberately fail a baseline in temporary Git
repositories. Changes excluded by `.gitignore` or `.git/info/exclude` leave the
snapshot unchanged; changes to tracked or non-ignored untracked files report both
the original baseline failure and the snapshot failure. In a separate one-off
manual verification on 2026-09-24, temporary copies removed ignore filtering or
replaced `AggregateError` with the last error; the corresponding named regression
assertions failed for both mutations. These two mutation procedures are not
included in `npm test` or `npm run test:mutation`; `npm test` exercises the
unmodified runner's regression tests, and `test:mutation` repeats only the two
export/preview mutations listed above.

The file-policy check uses an allowlist of source paths plus regular-file and
UTF-8 checks on staged blobs, tracked working copies, and non-ignored untracked
files. Unstaged binary content or symlink replacements are rejected; staged
binary content is still rejected even if the working copy has been repaired or
deleted. An unstaged deletion of valid indexed content is allowed. The integration
tests use a self-contained skill/reference fixture so new links in the real
plugin do not change their setup; `npm run validate` checks the real skill links.
The tests initialize temporary Git repositories and run the actual validator before
`git add`: untracked `media/x.png`, binary content under a Markdown path, and a
dangling symlink are all rejected. Non-regular files are rejected without opening
their targets. Without Git metadata, metadata/skill validation still runs and
the omitted source checks are explicitly reported as skipped.

The policy does not establish copyright ownership of text; source provenance
still requires review. The font-license test compares the three copied notices
byte-for-byte with their installed upstream packages.

Actual TAP excerpts from the Node 22.18.0 full-suite run on 2026-09-24
(intervening test output omitted):

```tap
# Subtest: mutation snapshots ignore changes excluded by Git ignore rules
ok 5 - mutation snapshots ignore changes excluded by Git ignore rules
  ---
  duration_ms: 256.222416
  type: 'test'
  ...
# Subtest: mutation checks preserve both baseline and snapshot errors for tracked.md
ok 6 - mutation checks preserve both baseline and snapshot errors for tracked.md
  ---
  duration_ms: 256.812333
  type: 'test'
  ...
# Subtest: mutation checks preserve both baseline and snapshot errors for untracked.md
ok 7 - mutation checks preserve both baseline and snapshot errors for untracked.md
  ---
  duration_ms: 246.758167
  type: 'test'
  ...
```

```tap
# Subtest: source validation checks unstaged edits and preserves index checks
    # Subtest: unstaged binary content in a tracked file is rejected
    ok 1 - unstaged binary content in a tracked file is rejected
      ---
      duration_ms: 156.259708
      type: 'test'
      ...
```

```tap
# Subtest: validation explicitly reports skipped source checks without Git metadata
ok 21 - validation explicitly reports skipped source checks without Git metadata
  ---
  duration_ms: 66.743667
  type: 'test'
  ...
1..21
# tests 31
# suites 0
# pass 31
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 8002.287125
```

Separate output excerpts from `npm run test:mutation` on Node 26.9.0 (exit 0):

```text
CAUGHT: PDF page-count guard — export rejects a truncated PDF before publishing verification.json
CAUGHT: preview directory boundary — /%2e%2e%2fslides.md returns 404; /..%2fslides.md returns 404
Both mutations were caught.
Workspace unchanged: 43 files checked (tracked and non-ignored untracked files).
```

See [dependency pins](dependencies.md) for the verified xmldom CVE mapping.

## Repository automation checks

Validated locally on 2026-09-25, macOS arm64 with Node 26.9.0:

- `npm test`: 31 passed, 0 failed, including complete role instructions in the
  portable and chat-only prompts.
- `npm run test:mutation`: both export/preview mutations caught; all 48 tracked
  and non-ignored untracked source files unchanged.
- `npm run test:release`: an isolated first release synchronized all five version
  files, retained dependency pins, and generated the tag, changelog, and release
  notes. An immediate rerun and a docs-only follow-up left HEAD unchanged.
  The same script also passed under Node 22.18.0, the release job's runtime.
- A standalone starter installed with `npm ci` and exported ten PDF pages using
  its own dependencies. Commands ran inside the generated deck directory.
- `npm run validate`, the four edited operation skills' frontmatter checks,
  `actionlint` on both workflows, and `git diff --check` passed.

Actual release-check output:

```text
PASS: first release synchronizes npm/plugin versions and preserves dependency pins.
PASS: rerunning an already released commit is a clean no-op.
PASS: documentation-only commits do not create another release.
```

At that validation point, these were local checks. The GitHub Actions matrix, Ubuntu AppArmor profile,
bot push permissions, and GitHub Release publication have not run on GitHub yet.
No tag or release was published during local validation.

The baseline CI and v0.2.0 release subsequently passed in
[GitHub Actions run 36106005993](https://github.com/Lee-W/ras/actions/runs/36106005993).

The built-in browser connection was unavailable. Visual inspection used screenshots generated by the project browser tooling, and playback/presenter behavior was tested with Puppeteer. Cross-platform CJK font appearance and live presentation timing remain untested.

## Taiwanese Mandarin typography, review status, and project memory

Validated locally on 2026-09-25, macOS arm64:

- Full suite: 42 tests passed on Node 22.18.0 and 26.9.0, including the final
  invalid-state guard. Malformed JSON and non-object state values are rejected
  without overwriting the existing memory or review file.
- Offline Chromium checks confirm the bundled Noto Sans TC font actually renders
  Taiwanese Mandarin headings, body text, code comments, and Mermaid labels. Diagram labels
  fit their nodes, use SVG text, and embed their fonts. All four copied font
  licence notices match the installed dependency files byte-for-byte.
- Review tests cover separate machine/visual/factual states, partial coverage,
  stale hashes, and creation/deletion of brief, outline, and source ledger files.
  Real export tests verify that recorded reviews survive rebuilds and that
  exported verification changes from pending to passed to stale with the evidence.
  Test-only review attestations are synthetic, not claims of human inspection.
- Memory tests cover project isolation, explicit replacement, preservation of
  unrelated entries, malformed state, symlink rejection, Git exclusion, portable
  CLI use, and remember/retro prompts in tool-capable and chat-only modes.
- `npm run test:mutation` caught both named PDF/preview mutations and reported
  `Workspace unchanged: 59 files checked (tracked and non-ignored untracked files).`
- `npm run test:release` passed the first release, immediate rerun, docs-only
  follow-up, and later patch release on Node 26.9.0. The patch scenario preserves
  earlier changelog entries and dependency pins.
- `npm run validate` and the six edited/new skill frontmatter checks passed.

Actual final Node 22.18.0 TAP summary:

```tap
1..29
# tests 42
# suites 0
# pass 42
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 17481.678667
```

An independently initialized project outside the repository installed its own
dependencies with `npm ci`. It exported the original ten-page starter and an
original three-page Taiwanese Mandarin fixture. HTML, PNG, and parsed PDF page counts agree.
All thirteen PDF pages were rendered to images and visually inspected: no
missing glyphs, clipped long title/code comments, or overflowing diagram
labels were observed. Source hashes retained from those inspected exports:

| Export | Pages inspected | Source SHA-256 |
| --- | --- | --- |
| Original starter | 1–10 | `4fe6e78944f79b7aedea40101a24de287283af2f25c141c87d2c046c29dc87e1` |
| Taiwanese Mandarin fixture | 1–3 | `56fa58ad355dcdf14d0fcefa4c8c18b769a3c7af44a4e266ac524ca97d023f49` |

These exports preceded the final non-rendering invalid-state guard and terminology
updates. The full suites above cover the guard; after standardizing labels as
Taiwanese Mandarin / 臺灣華語 and renaming the fixture to `mandarin.test.mjs`,
Node 26.9.0 passed all 42 tests again. The standalone status and memory-list
commands also ran successfully. Status correctly kept unrecorded visual/factual
reviews pending, and the new memory store was empty. Fixtures, fonts, and rendered
files remain outside repository source.

The new feature changes have not run in GitHub Actions yet. Live remember/retro
conversations in each AI host remain untested; the shared prompts and persistence
helpers were tested locally. Other operating systems and live presentation timing
remain unverified.

Reproduce from the repository:

```sh
npm ci
npm run validate
npm test
npm run test:mutation
node scripts/ras.mjs init /path/to/new-talk
```

Then run `npm ci` and `npm run export` inside the new deck. Generated output is disposable and replaced by each build. Before publishing a change, inspect the current rendered pages and check the current Git file list; keep reference fixtures outside this repository.
