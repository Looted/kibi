---
title: Functions and function-valued variables keep the staged implements rule
status: open
priority: must
required_evidence: tested
semantic_text: kibi check --staged must accept a changed declaration's record without an implements link only when its symbol_role is structural, type-shape, config or module and its extracted kind is not function, class, method, property or accessor and is not a callable variable.
semantic_clauses:
  - kibi check --staged must accept a changed declaration's record without an implements link only when its symbol_role is structural, type-shape, config or module and its extracted kind is not function, class, method, property or accessor and is not a callable variable.
logic_claims:
  - CLAIM-217D1C9ABB2E22CB
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b4ea27078dd2707fb9d5ebe735198b57b398fd315056b73465ab78c76b74d0ee
semantic_inventory:
  - claim_key: CLAIM-217D1C9ABB2E22CB
    claim_text: kibi check --staged must accept a changed declaration's record without an implements link only when its symbol_role is structural, type-shape, config or module and its extracted kind is not function, class, method, property or accessor and is not a callable variable
    role: normative
    status: modeled
    span:
      start: 0
      end: 266
    reason: Grounded by the linked fact with this claim key.
tags:
  - staged-gate
  - symbols
  - traceability
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
  approved_by: maintainer
  ref: 'Maintainer, in review on 2026-11-16: approved this requirement statement in its reworded form.'
id: REQ-behavioral-kinds-keep-implements
type: req
---
kibi check --staged must accept a changed declaration's record without an implements link only when its symbol_role is structural, type-shape, config or module and its extracted kind is not function, class, method, property or accessor and is not a callable variable.

## Context

A benchmark run of agents working in an onboarded open-source repository showed the staged gate refusing 57% of correct commits. Onboarding records the code that decides each behavior, not every declaration, so most source files keep declarations without a symbol record; the gate demanded a record for every declaration in each staged file, and an agent whose change touched one function was blocked over neighbours it never edited. The staged link rule required an implements link for every changed declaration, so a changed constant forced an invented requirement link. A non-behavioral role now excuses the link for the changed record, but a role an agent writes must not excuse code that decides behavior: a function, class, method, property or accessor, or a variable whose value is a function, still needs its link.

## Source

> Maintainer, in review on 2026-11-16: approved this requirement statement in its reworded form.
