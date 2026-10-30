---
title: A compile plan application journals its writes before the first one
status: active
tags:
  - lane:ontology
  - planning
  - apply-plan
  - journal
claim_key: CLAIM-E6948C655D374651
claim_text: Before its first write, a compile plan application must record a durable journal with the plan hash, the before and after bytes of every workspace file it changes, and every store upsert
text_ref: .kb/requirements/REQ-kibi-change-to-proof-plan-compiler-v2.md
fact_kind: property_value
subject_key: kibi.proof.change_plan
property_key: writes_without_prior_journal_entry
operator: eq
value_type: int
value_int: 0
origin:
  kind: agent
  recorded_at: '2026-10-04T02:20:13.801Z'
id: FACT-PRED-plan-apply-journal
type: fact
---
