---
title: The staged gate drops inherited symbol gaps without a word
status: active
fact_kind: property_value
subject_key: kibi.cli.check.staged
property_key: reports_inherited_symbol_gaps_without_blocking
operator: neq
value_type: bool
value_bool: true
tags:
  - negative-path
  - staged-gate
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: FACT-NEG-staged-gate-reports-inherited-symbol-gaps-INHERITED-GAP-SILENT
type: fact
---
The failure side of the rule: untouched unrecorded declarations would vanish from the staged output, so nobody would learn they exist.