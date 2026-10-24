---
title: A requirement can be previewed and its grounding planned before its facts exist
status: open
required_evidence: tested
tags:
  - modeling
  - mutation
  - planning
  - search-lane
priority: must
semantic_text: A kb_upsert dry run of a requirement must stage its planned facts before validating the grounding and previewing contradictions. kb_model mode predicates must return a hash-bound compile plan for a complete grounding of a stored requirement. The hash-bound grounding plan must report a contradiction with the current KB as blocked before any write.
logic_claims:
  - CLAIM-CB0E6F78C31F52FE
  - CLAIM-A7A0F67BC27AA7EA
  - CLAIM-68A539DD3CE44F17
semantic_clauses:
  - A kb_upsert dry run of a requirement must stage its planned facts before validating the grounding and previewing contradictions.
  - kb_model mode predicates must return a hash-bound compile plan for a complete grounding of a stored requirement.
  - The hash-bound grounding plan must report a contradiction with the current KB as blocked before any write.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
rationale: Search-lane round 1 showed that an agent could only learn about an allow/deny conflict after writing the fact, and that kb_model plans carried no hash kb_apply_plan could accept; the what-if route and the hash-bound plan close both gaps.
semantic_source_hash: 35ad1e59e9d29143d67f71630a8541a2dc5402ee65a50949f4f557285aadbc18
semantic_inventory:
  - claim_key: CLAIM-CB0E6F78C31F52FE
    claim_text: A kb_upsert dry run of a requirement must stage its planned facts before validating the grounding and previewing contradictions
    role: normative
    span:
      start: 0
      end: 127
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-A7A0F67BC27AA7EA
    claim_text: kb_model mode predicates must return a hash-bound compile plan for a complete grounding of a stored requirement
    role: normative
    span:
      start: 129
      end: 240
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-68A539DD3CE44F17
    claim_text: The hash-bound grounding plan must report a contradiction with the current KB as blocked before any write
    role: normative
    span:
      start: 242
      end: 347
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
origin:
  kind: agent
  recorded_at: '2026-10-11T19:12:01.478Z'
id: REQ-model-what-if-planned-facts
type: req
---
# A requirement can be previewed and its grounding planned before its facts exist

A kb_upsert dry run of a requirement must stage its planned facts before validating the grounding and previewing contradictions. kb_model mode predicates must return a hash-bound compile plan for a complete grounding of a stored requirement. The hash-bound grounding plan must report a contradiction with the current KB as blocked before any write.

## Context

In search-lane round 1 on the test project (A10 what-if) the dry run of a requirement that links a fact kb_model had planned failed with "logical grounding target … must declare a claim_key" because the fact was not written yet, so the decision-conflict check never ran and the agent only saw the conflict after writing the fact; kb_model itself planned the deny fact without mentioning the stored allow rule on the same key, and its applyPlan carried no hash, so the instructions' kb_apply_plan step was impossible for predicate plans. Asked by the project owner through the search-lane fix PRs (analysis in the project files, fix PR 4). The dry run therefore accepts `plannedFacts`, validated and staged as kb_apply_plan stages a plan's steps, and kb_model returns the grounding as a kibi.compile-plan.v1 whose contradictionAnalysis is the what-if over the current KB.

## Source

> "01 kb_model (text 'A viewer is allowed to delete analysis requests.', full bindings) -> eligible 0.98, plan FACT-PRED-37DDCF1604E9, warnings: [], no mention of the existing deny even with 8 permission facts in the KB. 02 fact dryRun -> valid: true. 05 -> 'logical grounding target FACT-PRED-37DDCF1604E9 must declare a claim_key'. applyPlan has no hash." - round 1 analysis, A10 row and PR-3 item.
