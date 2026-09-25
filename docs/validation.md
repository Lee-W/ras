# First-version validation

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

These are local checks. The new GitHub Actions matrix, Ubuntu AppArmor profile,
bot push permissions, and GitHub Release publication have not run on GitHub yet.
No tag or release was published during local validation.

The built-in browser connection was unavailable. Visual inspection used screenshots generated by the project browser tooling, and playback/presenter behavior was tested with Puppeteer. Cross-platform CJK font appearance and live presentation timing remain untested.

Reproduce from the repository:

```sh
npm ci
npm run validate
npm test
npm run test:mutation
node scripts/ras.mjs init /path/to/new-talk
```

Then run `npm ci` and `npm run export` inside the new deck. Generated output is disposable and replaced by each build. Before publishing a change, inspect the current rendered pages and check the current Git file list; keep reference fixtures outside this repository.
