---
title: implementedBy leaves no coveredBy test unlinked
status: active
fact_kind: property_value
subject_key: mcp.kb_upsert
property_key: implemented_by_covered_by_tests_left_unlinked
operator: eq
value_type: int
value_int: 0
tags:
  - lane:strict
  - fact:property_value
  - mutation
origin:
  kind: agent
  recorded_at: '2026-11-16T16:50:00.000Z'
claim_key: CLAIM-98BE8CF9C9419C5F
claim_text: An implementedBy entry of kb_upsert must accept coveredBy test ids and record a covered_by link from the entry's symbol to each of those tests
text_ref: REQ-kb-upsert-implemented-by-covered-by
id: FACT-kb-upsert-implemented-by-covered-by
type: fact
---
Every coveredBy test id of an implementedBy entry gets a covered_by link from the entry's symbol. Grounds the clause of REQ-kb-upsert-implemented-by-covered-by.