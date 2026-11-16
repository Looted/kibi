---
title: Symbol traceability exempts a behavioral symbol that implements nothing
status: active
fact_kind: property_value
subject_key: kibi.symbols.traceability
property_key: linkless_non_behavioral_symbols_exempt_from_traceability
operator: neq
value_type: bool
value_bool: true
tags:
  - negative-path
  - symbols
  - traceability
  - coverage
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: FACT-NEG-symbol-traceability-behavioral-only-BEHAVIORAL-EXEMPTED
type: fact
---
The failure side of the rule: a behavioral record with no requirement link would pass because the exemption reached past non-behavioral roles.