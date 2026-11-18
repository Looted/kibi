---
title: Full kibi check reports symbol debt without blocking
status: closed
priority: must
required_evidence: tested
semantic_text: kibi check run without a rule or file scope must report unrecorded declarations per file, for files that have at least one symbol record, and as a repository total as non-blocking output, and must include the total in JSON output.
semantic_clauses:
  - kibi check run without a rule or file scope must report unrecorded declarations per file, for files that have at least one symbol record, and as a repository total as non-blocking output, and must include the total in JSON output.
logic_claims:
  - CLAIM-6C1A8C867A9613AC
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c4b5945e756f7fd0a0f4b3cb2d1e35a047810ac72bfc903b563630e07651f8fc
semantic_inventory:
  - claim_key: CLAIM-6C1A8C867A9613AC
    claim_text: kibi check run without a rule or file scope must report unrecorded declarations per file, for files that have at least one symbol record, and as a repository total as non-blocking output, and must include the total in JSON output
    role: normative
    status: modeled
    span:
      start: 0
      end: 229
    reason: Grounded by the linked fact with this claim key.
tags:
  - check
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
  approved_by: maintainer
  ref: 'Maintainer, in review on 2026-11-16: approved this requirement statement in its reworded form.'
id: REQ-check-reports-symbol-debt
type: req
---
kibi check run without a rule or file scope must report unrecorded declarations per file, for files that have at least one symbol record, and as a repository total as non-blocking output, and must include the total in JSON output.

## Context

A benchmark run of agents working in an onboarded open-source repository showed the staged gate refusing 57% of correct commits. Onboarding records the code that decides each behavior, not every declaration, so most source files keep declarations without a symbol record; the gate demanded a record for every declaration in each staged file, and an agent whose change touched one function was blocked over neighbours it never edited. With the staged gate judging only touched declarations, the unrecorded rest needs one place where a person can see it. An unscoped kibi check counts it per file, for files the KB already links, and as a repository total in text and in JSON symbolDebt; rule- or file-scoped checks such as the proof gate stay fast and carry no debt.

## Source

> Maintainer, in review on 2026-11-16: approved this requirement statement in its reworded form.
