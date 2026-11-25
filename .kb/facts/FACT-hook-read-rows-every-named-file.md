---
title: A shell read gets rows from every file it names, focused by its line ranges
status: active
fact_kind: property_value
subject_key: kibi.host.read_rows
property_key: named_linked_files_left_undescribed
operator: eq
value_type: int
value_int: 0
text_ref: REQ-hook-read-rows-every-named-file
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-hook-read-rows-every-named-file
origin:
  kind: agent
  recorded_at: '2026-11-25T14:27:37.787Z'
id: FACT-hook-read-rows-every-named-file
type: fact
claim_key: CLAIM-0AD5C90941D8EA9E
claim_text: A shell command that reads several linked files must get rows from each of them in one block, and line ranges from sed -n, head, tail and grep -n must focus the rows as a Read tool range does
---
