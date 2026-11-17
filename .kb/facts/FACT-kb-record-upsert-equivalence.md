---
title: kb_record equals kb_upsert of its payload then kb_check changed:true
status: active
fact_kind: property_value
subject_key: kibi.kb_record
property_key: record_results_unlike_upsert_then_changed_check
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-86092A9F29ED09E9
claim_text: For the same knowledge base, the entities, relationships and verdict a kb_record call produces must be identical to those of kb_upsert with that payload followed by kb_check with changed:true for the same files. kb_record with dryRun:true must return that payload and kb_upsert's dry-run result for it, and write nothing
text_ref: REQ-kb-record-upsert-equivalence
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - kb-record
origin:
  kind: agent
  recorded_at: '2026-11-17T06:41:55.521Z'
id: FACT-kb-record-upsert-equivalence
type: fact
---
