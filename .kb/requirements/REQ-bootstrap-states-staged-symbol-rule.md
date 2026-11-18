---
title: Bootstrap skill states the staged symbol rule and reports symbol debt
status: open
priority: must
required_evidence: tested
semantic_text: The kibi-bootstrap skill must state the staged symbol rule and report the repository's unrecorded-declaration total after apply.
semantic_clauses:
  - The kibi-bootstrap skill must state the staged symbol rule and report the repository's unrecorded-declaration total after apply.
logic_claims:
  - CLAIM-B7CF6D826954B27C
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1663d0179522aefc684e06d882b466a963445eb533277f4f212ba0c050a09f80
semantic_inventory:
  - claim_key: CLAIM-B7CF6D826954B27C
    claim_text: The kibi-bootstrap skill must state the staged symbol rule and report the repository's unrecorded-declaration total after apply
    role: normative
    status: modeled
    span:
      start: 0
      end: 127
    reason: Grounded by the linked fact with this claim key.
tags:
  - bootstrap
  - skills
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
  approved_by: maintainer
  ref: 'Maintainer, in review on 2026-11-16: approved this requirement statement as written.'
id: REQ-bootstrap-states-staged-symbol-rule
type: req
---
The kibi-bootstrap skill must state the staged symbol rule and report the repository's unrecorded-declaration total after apply.

## Context

A benchmark run of agents working in an onboarded open-source repository showed the staged gate refusing 57% of correct commits. Onboarding records the code that decides each behavior, not every declaration, so most source files keep declarations without a symbol record; the gate demanded a record for every declaration in each staged file, and an agent whose change touched one function was blocked over neighbours it never edited. Nothing in onboarding told the person or the agent which declarations the commit gate would judge, so the first blocked commit came as a surprise. The kibi-bootstrap skill now states the rule at close-out, reports the unrecorded-declaration total as not blocking, and does not backfill it unless the person asks.

## Source

> Maintainer, in review on 2026-11-16: approved this requirement statement as written.
