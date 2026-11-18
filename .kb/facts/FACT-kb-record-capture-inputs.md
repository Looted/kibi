---
title: Every kb_record input reaches the requirement it records
status: active
fact_kind: property_value
subject_key: kibi.kb_record
property_key: record_inputs_left_out_of_requirement
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-515784DB35953EE2
claim_text: 'kb_record (CLI: kibi record --input -) must take a statement, a why, who said it (user, maintainer or agent), an optional quote, the code that implements the rule as {file, symbol} entries and an optional test id, and record them as one requirement whose body holds the statement, whose reason is the why, whose implementedBy links are the code and, with a test, whose verified_by link and covered_by links go to that test'
text_ref: REQ-kb-record-capture
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - kb-record
origin:
  kind: agent
  recorded_at: '2026-11-17T06:41:26.681Z'
id: FACT-kb-record-capture-inputs
type: fact
---
