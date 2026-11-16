---
title: kb_upsert must flag a listed requirement whose claim text still states the value from before the write
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:38.855Z'
subject_key: kibi.upsert.sibling_requirements
property_key: stale_sibling_claims_unflagged
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-A958B79C47032D8A
claim_text: kb_upsert must flag a listed requirement whose claim text still states the value from before the write
text_ref: REQ-upsert-flags-stale-sibling-claim
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-upsert-flags-stale-sibling-claim
id: FACT-upsert-flags-stale-sibling-claim
type: fact
---
Counts listed sibling requirements whose claim text contains the value from before the write and not the new value but whose statesOldValue is false; zero means each such claim is flagged.