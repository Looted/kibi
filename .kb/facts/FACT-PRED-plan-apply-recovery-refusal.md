---
title: Recovery refuses without change when a journaled file drifted
status: active
tags:
  - lane:ontology
  - planning
  - apply-plan
  - recovery
claim_key: CLAIM-F986051868A08A5A
claim_text: Recovery must change nothing and fail with PARTIAL_COMMIT_REPAIR_REQUIRED when a journaled file is at neither its before nor its after hash
text_ref: .kb/requirements/REQ-kibi-change-to-proof-plan-compiler-v2.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.plan.apply
  - journaled_file_at_neither_hash
  - partial_commit_repair_required_without_change
polarity: assert
canonical_key: logical_requirement_rule(kibi.plan.apply,journaled_file_at_neither_hash,partial_commit_repair_required_without_change)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:20:18.521Z'
id: FACT-PRED-plan-apply-recovery-refusal
type: fact
---
