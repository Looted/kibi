---
title: Hook usage records whose interface is not hook = 0
status: active
fact_kind: property_value
subject_key: kibi.telemetry.hook_usage_records
property_key: records_with_interface_other_than_hook
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-0B05A3DF0916DA59
claim_text: Every hook usage record must set its interface to hook
tags:
  - lane:ontology
  - telemetry
  - claude
id: FACT-PRED-claude-hook-telemetry-interface
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
case_waiver: 'One shared writer builds every hook row from a fixed record shape, so no row can lack this field; the happy-path tests check it.'
case_waiver_approved_by: Piotr Franczyk
---
