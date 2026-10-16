---
title: A bootstrap claim left for authoring names the prose-only requirement it must be compared with
status: active
expects: success
tags:
  - bootstrap
  - contradictions
origin:
  kind: agent
  recorded_at: '2026-10-16T08:59:26.800Z'
id: SCEN-bootstrap-authoring-claim-review
type: scenario
---
Given a drawing editor KB whose closed, prose-only requirement says Escape cancels a label edit without saving, when the agent previews a bootstrap plan with the unmodelable claim that Escape saves the label and an unrelated unmodelable claim about exported drawings, then both claims are left for authoring, the Escape claim gets a `conflict-review:` diagnostic naming that requirement with an instruction to compare them when compiling it with `kb_compile_intent` and to report the verdict through `conflictReviews`, the unrelated claim gets none, and the knowledge-source summary and `recommendedActions` count one claim to review.

This exists because claims Kibi cannot model were the ones the plan left unreviewed.
