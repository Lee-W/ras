---
name: export
description: Build, verify, and export an existing RAS Marp project to HTML and PDF with notes and previews. Handles ras:export and preserves the existing talk content.
---

# RAS — export

Read [the shared workflow](../../references/workflow.md) and
[review contract](../../references/review.md). Locate the existing deck directory,
inspect its build instructions, and run its doctor/export commands. Use an existing
review only if both its source and context hashes still match (`npm run status`). Inspect the final renders and report
any missing verification. Return links to source, HTML, PDF, notes, and evidence.
Use the shared export flow and read each active role's file before its pass.

Do not silently rewrite content to make a failing export pass. Explain the specific
source/layout fix required, or apply it if the user has authorized revision.
