# RAS repository

Use Taiwanese Mandarin (臺灣華語) written in traditional characters when discussing
work with Wei. Name the language 臺灣華語 in Mandarin and Taiwanese Mandarin in English.

Keep the workflow model-neutral and self-contained:
Codex, Claude Code, and open models share `skills/` and `references/`.
Do not add mandatory vendor APIs, model names, global installations, or personal
paths. Keep chat-only drafting honest about actions that need tools.

Do not commit the supplied historical decks, their text extracts, anime images,
employer/conference logos, fonts, or other third-party assets. Local validation
fixtures belong outside this repository. Dependencies and generated output
remain ignored. Only original generic examples belong in `templates/`.
Preserve necessary dependency licence notices in generated output; do not
copy dependency assets into repository source.

Run `npm run validate` and `npm test` after relevant code changes. Build/export
a standalone generated project for changes to rendering or dependency versions.
Automated checks do not certify visual or factual review. Inspect changed pages
and retain the reviewed source hash. Do not publish or install globally unless
the user requests it.
