---
title: The staged gate keeps its scratch store in memory and judges only staged proofs
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: staged_scratch_store_saves_per_write
operator: eq
value_type: int
value_int: 0
tags:
  - lane:strict
  - fact:property_value
  - check
  - staged
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-16T18:30:00.000Z'
claim_key: CLAIM-2FF198CFDA282705
claim_text: kibi check --staged must not save its temporary knowledge base to disk after each write while it projects the staged entities, and must evaluate the evidence floor only for the requirements the commit stages
id: FACT-staged-gate-scratch-store
type: fact
text_ref: REQ-staged-gate-scratch-store
---
The grounded claim of REQ-staged-gate-scratch-store: kibi check --staged must not save its temporary knowledge base to disk after each write while it projects the staged entities, and must evaluate the evidence floor only for the requirements the commit stages.