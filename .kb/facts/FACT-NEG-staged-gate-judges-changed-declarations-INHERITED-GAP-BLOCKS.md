---
title: The staged gate blocks a commit over unrecorded declarations it did not add or change
status: active
fact_kind: property_value
subject_key: kibi.cli.check.staged
property_key: judges_symbol_records_only_for_touched_declarations
operator: neq
value_type: bool
value_bool: true
tags:
  - negative-path
  - staged-gate
  - symbols
  - traceability
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: FACT-NEG-staged-gate-judges-changed-declarations-INHERITED-GAP-BLOCKS
type: fact
---
The failure side of the rule: the gate would refuse a correct commit because declarations it never touched have no symbol record.