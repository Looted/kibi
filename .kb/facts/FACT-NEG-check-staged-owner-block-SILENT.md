---
title: An unowned declaration gets no owner block
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: staged_blocks_per_unowned_declaration
operator: lt
value_type: int
value_int: 1
tags:
  - negative-path
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T16:50:00.000Z'
id: FACT-NEG-check-staged-owner-block-SILENT
type: fact
---
The other failure side: a declaration that no requirement owns is refused without a block that names its candidate owners and the input that links it.