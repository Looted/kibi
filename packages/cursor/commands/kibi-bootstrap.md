---
name: kibi-bootstrap
description: Bootstrap Kibi knowledge for an existing repository
---

# Kibi bootstrap

Route an explicit bootstrap request to the canonical `kibi-bootstrap` skill.

## Route

Inspect `kb_status.bootstrap` and follow its typed `nextAction`. If Kibi
infrastructure is missing, run `kibi init` first. Then use the canonical
planner and pass its unchanged returned `structuredContent.plan` to
`kb_apply_plan` only after explicit approval.

Questions come only from a `needs_context` planner result. Inspect typed apply
`nextActions`, finish with `kb_check` and `kb_status`, and never read or edit
`.kb` directly.
