---
title: The KB engine must not create a hashed branch store beside an unmigrated legacy store
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: hashed_store_created_beside_unmigrated_legacy_store
operator: eq
value_type: bool
value_bool: false
tags:
  - lane:strict
  - fact:property_value
  - branching
  - migration
claim_text: The KB engine must not create a hashed branch store beside an unmigrated legacy store
text_ref: REQ-kibi-legacy-attachment-engine-refusal
origin:
  kind: agent
  recorded_at: '2026-11-16T20:43:56.921Z'
claim_key: CLAIM-CD70DAEFE1018721
id: FACT-kibi-legacy-store-no-hashed-store-created
type: fact
---
The KB engine must not create a hashed branch store beside an unmigrated legacy store. Grounds a clause of REQ-kibi-legacy-attachment-engine-refusal.