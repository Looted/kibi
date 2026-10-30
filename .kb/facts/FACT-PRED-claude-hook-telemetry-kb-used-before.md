---
title: Read, edit, search or Kibi call records without the prior Kibi use flag = 0
status: active
fact_kind: property_value
subject_key: kibi.telemetry.hook_usage_records
property_key: read_edit_search_or_kibi_records_without_kb_used_before
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-80E1ED04FE7E1D64
claim_text: Every hook usage record for a read, edit, search, or Kibi call must record whether the session had used Kibi before that call
tags:
  - lane:ontology
  - telemetry
  - claude
id: FACT-PRED-claude-hook-telemetry-kb-used-before
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
case_waiver: 'One shared writer builds every hook row from a fixed record shape, so no row can lack this field; the happy-path tests check it.'
case_waiver_approved_by: Piotr Franczyk
---
