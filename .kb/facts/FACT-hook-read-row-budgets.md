---
title: Read and search rows stay within per-event and per-session budgets, each requirement once
status: active
fact_kind: property_value
subject_key: kibi.host.read_rows
property_key: rows_beyond_budget
operator: eq
value_type: int
value_int: 0
text_ref: REQ-hook-read-row-budgets
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-hook-read-row-budgets
origin:
  kind: agent
  recorded_at: '2026-11-25T14:28:12.976Z'
id: FACT-hook-read-row-budgets
type: fact
claim_key: CLAIM-886415574118F48E
claim_text: A read or search hook must show at most 3 rows per event, or 5 for a whole file, and at most 10 rows and 2,300 characters per session
---
