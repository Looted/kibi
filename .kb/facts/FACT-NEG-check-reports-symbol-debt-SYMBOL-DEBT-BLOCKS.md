---
title: The full check fails a repository for its symbol debt
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: min_symbol_records_in_debt_file
operator: lt
value_type: int
value_int: 1
tags:
  - negative-path
  - check
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: FACT-NEG-check-reports-symbol-debt-SYMBOL-DEBT-BLOCKS
type: fact
---
The failure side of the rule: unrecorded declarations would turn the full check red although no rule judges them.