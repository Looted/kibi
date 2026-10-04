---
title: A compile plan commits in one store transaction or changes nothing
status: active
tags:
  - lane:ontology
  - planning
  - apply-plan
  - atomic
claim_key: CLAIM-E1FC8188B2B9D096
claim_text: A compile plan application must commit all of its steps in one store transaction or leave the store and the workspace unchanged
text_ref: .kb/requirements/REQ-kibi-change-to-proof-plan-compiler-v2.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.plan.apply
  - compile_plan_steps
  - single_store_transaction_or_no_change
polarity: assert
canonical_key: logical_requirement_rule(kibi.plan.apply,compile_plan_steps,single_store_transaction_or_no_change)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:20:11.403Z'
id: FACT-PRED-plan-apply-all-or-nothing
type: fact
---
