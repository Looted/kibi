---
title: Hook usage records without the host agent = 0
status: active
tags:
  - lane:ontology
  - telemetry
  - claude
claim_key: CLAIM-54E7F86597592FB8
claim_text: Every hook usage record must name the host agent that wrote it
text_ref: .kb/requirements/REQ-claude-hook-usage-telemetry-v2.md
fact_kind: property_value
subject_key: kibi.telemetry.hook_usage_records
property_key: records_without_host_agent
operator: eq
value_type: int
value_int: 0
origin:
  kind: agent
  recorded_at: '2026-10-04T02:12:58.579Z'
id: FACT-PRED-claude-hook-telemetry-host
type: fact
case_waiver: 'One shared writer builds every hook row from a fixed record shape, so no row can lack this field; the happy-path tests check it.'
case_waiver_approved_by: Piotr Franczyk
---
