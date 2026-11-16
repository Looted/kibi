---
title: Symbol traceability and coverage judge behavioral symbols only
status: open
priority: must
required_evidence: tested
semantic_text: The symbol-traceability and symbol-coverage rules must not flag a symbol whose symbol_role is structural, type-shape, config or module and that has no implements link. The non-behavioral symbol roles shall be structural, type-shape, config and module.
semantic_clauses:
  - The symbol-traceability and symbol-coverage rules must not flag a symbol whose symbol_role is structural, type-shape, config or module and that has no implements link.
  - The non-behavioral symbol roles shall be structural, type-shape, config and module.
logic_claims:
  - CLAIM-776AC7F4344BC49C
  - CLAIM-42CC2399770CE6B0
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 71ffdbf7450f42fa137a2a255fbed10be9b789ea661b3b3025f4b5f8e3d9552f
semantic_inventory:
  - claim_key: CLAIM-776AC7F4344BC49C
    claim_text: The symbol-traceability and symbol-coverage rules must not flag a symbol whose symbol_role is structural, type-shape, config or module and that has no implements link
    role: normative
    status: modeled
    span:
      start: 0
      end: 166
  - claim_key: CLAIM-42CC2399770CE6B0
    claim_text: The non-behavioral symbol roles shall be structural, type-shape, config and module
    role: normative
    status: modeled
    span:
      start: 168
      end: 250
tags:
  - symbols
  - traceability
  - coverage
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
  approved_by: maintainer
  ref: 'Maintainer, in review on 2026-11-16: approved this requirement statement in its reworded form.'
id: REQ-symbol-traceability-behavioral-only
type: req
---
The symbol-traceability and symbol-coverage rules must not flag a symbol whose symbol_role is structural, type-shape, config or module and that has no implements link. The non-behavioral symbol roles shall be structural, type-shape, config and module.

## Context

A benchmark run of agents working in an onboarded open-source repository showed the staged gate refusing 57% of correct commits. Onboarding records the code that decides each behavior, not every declaration, so most source files keep declarations without a symbol record; the gate demanded a record for every declaration in each staged file, and an agent whose change touched one function was blocked over neighbours it never edited. symbol-traceability and symbol-coverage ignored symbol_role, so recording a schema constant or a type made an agent invent an implements link to a requirement the declaration does not decide. A structural, type-shape, config or module record with no implements link is now accepted as it is; one that does carry implements keeps the coverage rule.

## Source

> Maintainer, in review on 2026-11-16: approved this requirement statement in its reworded form.

Maintainer-approved addition (2026-11-16), naming the set as its own sentence so a certificate can prove it: "The non-behavioral symbol roles shall be structural, type-shape, config and module."
