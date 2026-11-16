---
title: The staged gate accepts an unrecorded changed declaration as covered
status: active
fact_kind: property_value
subject_key: kibi.cli.check.staged
property_key: unrecorded_changed_declarations_in_covered_file
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
  - staged-gate
  - symbols
  - impact
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: FACT-NEG-staged-evidence-scoped-to-changed-declarations-UNRECORDED-CHANGE-ACCEPTED
type: fact
---
The failure side of the rule: a file would count as covered although one declaration the commit adds or changes in it has no symbol record.