---
title: kb_upsert must list every other current requirement that constrains the quantity whose value the write changes
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:33.975Z'
subject_key: kibi.upsert.sibling_requirements
property_key: sibling_requirements_unlisted
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-286E29CD707E4A12
claim_text: kb_upsert must list every other current requirement that constrains the quantity whose value the write changes
text_ref: REQ-upsert-lists-sibling-requirements
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-upsert-lists-sibling-requirements
id: FACT-upsert-lists-sibling-requirements
type: fact
---
Counts current requirements grounded on the written value fact, or on another fact of the same quantity, that a kb_upsert changing the value does not list under siblings with a required next action; zero means each is listed.