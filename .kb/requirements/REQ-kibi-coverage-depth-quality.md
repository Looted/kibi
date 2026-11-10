---
title: Kibi check classifies each requirement's coverage depth and reports shallow coverage as a non-blocking diagnostic
status: open
semantic_text: Kibi check must classify each requirement's coverage depth from its scenario, test and passing end-to-end evidence, and report shallow coverage as a non-blocking quality diagnostic.
semantic_clauses:
  - Kibi check must classify each requirement's coverage depth from its scenario, test and passing end-to-end evidence, and report shallow coverage as a non-blocking quality diagnostic
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 06516d73262f2f32c8601ef24b08c3fa8cac0b2a574a30a08ae9749b678a69f9
semantic_inventory:
  - claim_key: CLAIM-B68A884FB59034E5
    claim_text: Kibi check must classify each requirement's coverage depth from its scenario, test and passing end-to-end evidence, and report shallow coverage as a non-blocking quality diagnostic
    role: normative
    status: modeled
    span:
      start: 0
      end: 180
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-B68A884FB59034E5
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T10:27:39.306Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - auditability
  - diagnostics
  - coverage
id: REQ-kibi-coverage-depth-quality
type: req
---
Kibi check must classify each requirement's coverage depth from its scenario, test and passing end-to-end evidence, and report shallow coverage as a non-blocking quality diagnostic.

## Context

A requirement whose only evidence is a scenario, an open test or unit tests looks covered in a plain link count, so check names its depth and asks for behavior-level evidence without blocking the change.

Carved out of REQ-audit-quality-diagnostics-v1, which keeps the general rule that heuristic signals stay non-blocking; this child names the one heuristic that judges how deep a requirement's test evidence goes.

## Source

> Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"
