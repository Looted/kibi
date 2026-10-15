---
title: An Escape claim that saves, next to a prose-only requirement that Escape cancels without saving, is unresolved with that requirement to review
status: active
expects: success
tags:
  - contradictions
  - compile-intent
  - bootstrap
origin:
  kind: agent
  recorded_at: '2026-10-15T16:05:05.903Z'
id: SCEN-kibi-contradiction-review-candidates
type: scenario
---
Given a current requirement written only as prose, "Pressing Escape while editing a shape label cancels the edit. No save operation occurs", when the agent compiles the intent "Pressing Escape while editing a shape label saves the label text", then `kb_compile_intent` returns `contradictionAnalysis.outcome: unresolved` with reason `unmodeled_target`, lists the cancel requirement in `reviewCandidates` with its statement, and tells the agent to compare and report through `conflictReviews`; a reported conflict blocks the plan. A bootstrap plan that plans a claim next to a prose-only requirement on the same topic names that requirement for review.

This exists because the contradiction check reported `no_conflict` for claims it had not compared with anything, while discovery had just returned a requirement saying the opposite.
