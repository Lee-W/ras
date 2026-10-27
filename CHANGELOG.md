## v0.13.0 (2026-10-27)

### Feat

- name the profile layer and let ras.config.json point at it
- trim the exported prompt per operation and accept --profile
- split content and tooling hashes for review staleness
- merge deck package.json on upgrade and keep review evidence in git

### Fix

- keep upgrade from touching ras.config.json for the optional profile key
- label CLI failures and make doctor launch the browser

### Refactor

- move roles out of the agents directory and fold the router into SKILL.md
- split prompt, scaffold, hash and config out of ras and project

## v0.12.0 (2026-10-26)

### Feat

- turn a deck into a Markdown blog draft with npm run blog

## v0.11.0 (2026-10-23)

### Feat

- let export finish the PDF when the layout check fails
- frame key snippets in code blocks with «…» markers

### Fix

- keep boxed code lines aligned on Linux

## v0.10.0 (2026-10-07)

### Feat

- add a deck upgrade command

## v0.9.0 (2026-10-07)

### Feat

- let .label text use the credit size threshold

### Fix

- check slide text inside Marp's svg wrapper and against the content area

## v0.8.0 (2026-10-04)

### Feat

- add standalone Just commands and preserve PDFs during preview

## v0.7.0 (2026-10-01)

### Feat

- add outline operation and Taiwanese Mandarin operation guides

## v0.6.0 (2026-10-01)

### Feat

- add Taiwanese Mandarin role interactions

## v0.5.0 (2026-09-29)

### Feat

- add MIT licensing and image rights checks

### Fix

- include new deck inputs in mutation checks
- clarify licensing in generated presentations

## v0.4.0 (2026-09-26)

### Feat

- add multilingual documentation and local preview

## v0.3.0 (2026-09-25)

### Feat

- add Taiwanese Mandarin slides, review status, and memory

### Fix

- keep release checks valid after the first release

## v0.2.0 (2026-09-25)

### Feat

- give RAS roles distinct voices and explicit handoffs
- create and export portable Marp presentations with RAS
