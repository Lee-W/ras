---
name: create
description: Create a Marp presentation from a topic, brief, outline, or source material using RAS. Also handles ras:create and an explicit plan-only request.
---

# RAS — create

Read [the collaboration voice](../orchestrator-voice/SKILL.md) before the opening.
Read [the shared workflow](../../references/workflow.md), then the relevant
role files and [Marp conventions](../../references/marp.md). Use the user's
request or supplied arguments as the brief. Discover existing context before
asking questions. A `--plan` request ends with the outline, not a rendered deck.
Follow the shared operation flow and each active role's voice and handoff.

For creation, initialize a new deck with `scripts/ras.mjs init`, update its brief,
outline, source ledger, slide text and speaker notes, and choose its theme.
The initialized example is a working template, not the user's finished content.
Check all supplied and selected images using [image rights and credits](../../references/image-rights.md).
Record permission evidence and the required credit text in `sources.md`, including
images supplied by the user; put required notices in the audience-visible slides.
Continue through [review and verification](../../references/review.md), fix
problems, and deliver the Markdown, HTML, PDF, and actual verification evidence.

If asked to follow Wei's previous talks, read [Wei's profile](../../profiles/wei.md).
Keep project-specific facts and artwork out of the generic template.
