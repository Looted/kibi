---
title: kibi check --staged must accept a changed declaration's record without an implements link only when its symbol_role is structural, type-shape, config or module and its extracted kind is not function, class, method, property or accessor and is not a callable variable
status: active
fact_kind: property_value
subject_key: kibi.cli.check.staged
property_key: behavioral_kinds_keep_implements_link_rule
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-217D1C9ABB2E22CB
claim_text: kibi check --staged must accept a changed declaration's record without an implements link only when its symbol_role is structural, type-shape, config or module and its extracted kind is not function, class, method, property or accessor and is not a callable variable
text_ref: REQ-behavioral-kinds-keep-implements
tags:
  - lane:strict
  - fact:property_value
  - staged-gate
  - symbols
  - traceability
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: FACT-behavioral-kinds-keep-implements
type: fact
---
kibi check --staged must accept a changed declaration's record without an implements link only when its symbol_role is structural, type-shape, config or module and its extracted kind is not function, class, method, property or accessor and is not a callable variable. Grounds the clause of REQ-behavioral-kinds-keep-implements.