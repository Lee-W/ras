---
name: command-router
description: Route ras:create, ras:revise, ras:review, ras:export, ras:remember, and ras:retro requests to the matching shared skill.
---

# RAS command router

Accept `ras:<operation>`, `/ras:<operation>` when it reaches the model, or a
natural-language request to run one. Read the matching skill and forward the
remaining request unchanged:

| Operation | Source |
| --- | --- |
| create | [create](../create/SKILL.md) |
| revise | [revise](../revise/SKILL.md) |
| review | [review](../review/SKILL.md) |
| export | [export](../export/SKILL.md) |
| remember | [remember](../remember/SKILL.md) |
| retro | [retro](../retro/SKILL.md) |

The operation skill is the source of truth. Do not duplicate workflow rules here.
For an unknown operation, list supported ones rather than inventing behaviour.
This is model-side routing, not a promise of native slash-command registration
or autocomplete. Use the entry forms supported by the current host.
