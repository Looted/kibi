---
description: Bootstrap Kibi knowledge for this repository via the kibi-bootstrap skill
argument-hint: "[optional context, e.g. branch or focus area]"
skills: kibi-bootstrap
---

# Kibi bootstrap

Route this bootstrap request to the canonical `kibi-bootstrap` skill.

Request (may be empty): $ARGUMENTS

## Route

Inspect `kb_status.bootstrap` and follow its typed `nextAction`. If Kibi
infrastructure is missing, run `kibi init` first. Then use the canonical
planner (`kb_plan_bootstrap`) and pass its unchanged returned
`structuredContent.plan` to `kb_apply_plan` only after showing the complete
plan with its canonical hash and receiving explicit approval.

Questions come only from a `needs_context` planner result. Inspect typed apply
`nextActions`, finish with `kb_check` and `kb_status`, and never read or edit
`.kb` directly.
