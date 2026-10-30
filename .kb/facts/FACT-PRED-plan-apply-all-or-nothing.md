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
fact_kind: property_value
subject_key: kibi.proof.change_plan
property_key: store_transactions_per_plan_application
operator: lte
value_type: int
value_int: 1
origin:
  kind: agent
  recorded_at: '2026-10-04T02:20:11.403Z'
id: FACT-PRED-plan-apply-all-or-nothing
type: fact
---
