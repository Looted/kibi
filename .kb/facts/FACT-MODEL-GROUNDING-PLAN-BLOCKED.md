---
title: A grounding plan that contradicts the current KB is blocked before any write
status: active
tags:
  - lane:ontology
  - modeling
  - search-lane
text_ref: .kb/requirements/REQ-model-what-if-planned-facts.md
fact_kind: predicate
polarity: assert
canonical_key: logical_requirement_rule(kibi.plan.apply,grounding_plan_contradicting_current_kb,blocked_before_any_write)
claim_key: CLAIM-68A539DD3CE44F17
claim_text: The hash-bound grounding plan must report a contradiction with the current KB as blocked before any write
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.plan.apply
  - grounding_plan_contradicting_current_kb
  - blocked_before_any_write
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-11T19:11:35.840Z'
id: FACT-MODEL-GROUNDING-PLAN-BLOCKED
type: fact
---
The grounding plan's contradictionAnalysis is the what-if over the current KB plus the plan's steps. A witness the plan would introduce (for example an allow and a deny permission_rule on the same key) sets plan.status to blocked, kb_model names the witnesses in a warning, and kb_apply_plan refuses a plan that is not ready.

## Context

Search-lane round 1 on the test project: kb_model planned a deny fact with no mention of the stored allow rule on the same tuple; the conflict only surfaced after the fact was written. Asked by the project owner through the search-lane fix PRs.
