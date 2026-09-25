# Repository automation

## CI

`.github/workflows/ci.yml` runs on pull requests and manual dispatch, and can be
called by the main-branch release workflow. Its matrix covers Ubuntu 24.04 and
macOS 15 on Node 22.18.0 and 26.9.0. Each job installs locked dependencies and the
Puppeteer-pinned Chrome, validates repository source, runs tests and both
export/preview mutations, and initializes/installs/exports a standalone starter
deck outside the checkout. That export includes Mermaid, fonts, notes, PNGs,
and a PDF. Generated media is temporary and is not committed or published.

On Ubuntu, a scoped AppArmor profile permits the CI browser cache to use user
namespaces, following the [Chromium guidance](https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md).
The browser continues to use its sandbox. Local developer machines need no
AppArmor changes from this workflow.

Run locally:

```sh
npm ci
npm run validate
npm test
npm run test:mutation
npm run test:release
actionlint .github/workflows/ci.yml .github/workflows/bumpversion.yml
```

## Versions and releases

`.github/workflows/bumpversion.yml` runs the shared CI on pushes to `main`.
After it passes, Commitizen 4.16.2 reads Conventional Commits using `.cz.toml`:
`feat` changes bump the minor version; `fix` changes bump the patch version;
other commits without a release-eligible change do not create a release.
The package remains at major version zero while `major_version_zero` is enabled.

The [npm version provider](https://github.com/commitizen-tools/commitizen/blob/v4.16.2/commitizen/providers/npm_provider.py)
updates `package.json` and both root version entries in `package-lock.json`.
The explicit version-file list updates `plugin.json`, `.claude-plugin/plugin.json`,
and `.codex-plugin/plugin.json`. Commitizen also updates `CHANGELOG.md`, creates
a bump commit and an annotated `v…` tag. The workflow validates the changed
metadata, prepares release notes, atomically pushes the commit/tag, then creates
a GitHub Release in the same job. It does not publish to npm.

`npm run test:release` requires Git and uv. It copies repository source into a
temporary repository, runs the pinned Commitizen against a first feature release,
an immediate rerun, and a docs-only follow-up. It checks version synchronization,
unchanged dependency pins, the tag/changelog, release notes, source validation,
and both no-bump results. It never pushes, publishes, or changes the current
repository's history.

Use Conventional Commit messages on changes merged into `main`. GitHub Actions
must have `contents: write` for the release job, and branch rules must permit the
release bot's version commit. The publishing job is scoped to `Lee-W/ras`;
forks must adapt that repository guard before enabling their own publishing.
Manual dispatch on `main` can retry a run with no release yet. A rejected push
fails without forcing or moving the branch; rerun against the current `main`.
If pushing succeeded but release creation failed, create the missing GitHub
Release from the already-pushed tag instead of generating another bump.

Inspect the current version or a proposed bump locally:

```sh
uvx --from commitizen==4.16.2 cz version --project
uvx --from commitizen==4.16.2 cz bump --dry-run --yes
```

These are repository maintenance tools; generated decks still need only their
own Node.js dependencies. CI success certifies executed checks, not slide
aesthetics, claim accuracy, or live delivery timing.
