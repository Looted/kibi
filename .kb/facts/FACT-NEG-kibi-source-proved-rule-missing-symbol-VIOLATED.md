---
title: A rule every claim of which a source proof proves still reports a missing production symbol
status: active
fact_kind: property_value
subject_key: kibi.proof.requirement
property_key: source_proved_unimplemented_requirements_missing_symbol
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-18T10:54:31.990Z'
id: FACT-NEG-kibi-source-proved-rule-missing-symbol-VIOLATED
type: fact
---
A requirement such as "files under src/ui never import x", proved by a passing source proof over those files and implemented by no symbol, still reports missing_production_symbol, so its author has to add a false implements link or a waiver to reach a zero-finding gate.