---
title: Read and search rows stay within per-event and per-session budgets, each requirement once
status: active
fact_kind: property_value
subject_key: kibi.host.read_rows
property_key: repeated_requirement_rows
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
  recorded_at: '2026-11-25T14:28:51.940Z'
id: FACT-hook-read-row-budgets-repeated-requirement-rows
type: fact
claim_key: CLAIM-E1F55BBCFBB61C24
claim_text: A read or search hook must show each requirement at most once per session, counting rows that a Kibi tool result already showed, except that it shows a firm requirement of the focused symbol once
---
