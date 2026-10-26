---
name: ras
description: Create, revise, review, and export Marp presentations with RAS (RAISE A SLIDE), discuss a brief and outline before building, or remember presentation preferences and reflect on a session. Use for ras:create, ras:outline, ras:revise, ras:review, ras:export, ras:remember, and ras:retro.
---

# RAS — RAISE A SLIDE

Accept `ras:<operation>`, `/ras:<operation>` when it reaches the model, or a
natural-language request to run one. Read the matching operation skill and
forward the remaining request unchanged:

| Operation | Source |
| --- | --- |
| create | [create](skills/create/SKILL.md) |
| outline | [outline](skills/outline/SKILL.md) |
| revise | [revise](skills/revise/SKILL.md) |
| review | [review](skills/review/SKILL.md) |
| export | [export](skills/export/SKILL.md) |
| remember | [remember](skills/remember/SKILL.md) |
| retro | [retro](skills/retro/SKILL.md) |

For a natural-language request, choose the operation that matches the user's
intent. To discuss structure first, use `outline`. Without that request, a new
topic or a plan-only outline uses `create`. The operation skill is the source of
truth; do not duplicate workflow rules here.

For an unknown operation, list the supported ones rather than inventing
behaviour. This is model-side routing, not native slash-command registration or
autocomplete; use the entry forms the current host supports.

Install the whole repository in the host's skill directory and keep its relative
paths; scripts and references are resolved from this file's location.
