---
title: The quantity check skips booleans, strings, 0 and 1
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - check
  - quantity-duplicate
semantic_text: Kibi check must not compare boolean values, string values or the numbers 0 and 1 when it looks for one quantity stated twice.
rationale: Booleans, strings and the numbers 0 and 1 are shared by most unrelated facts (every rule modeled as a count of failures is eq 0), so comparing them would bury the real pairs under noise.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T16:12:11.770Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0f566b139935609f07db1131e0fa838ded4b7369a3a97fa78248a65f810edcd2
semantic_inventory:
  - claim_key: CLAIM-9ADE78F0A7402DC4
    claim_text: Kibi check must not compare boolean values, string values or the numbers 0 and 1 when it looks for one quantity stated twice
    role: normative
    status: modeled
    span:
      start: 0
      end: 124
logic_claims:
  - CLAIM-9ADE78F0A7402DC4
id: REQ-check-quantity-duplicate-trivial-values
type: req
---
Kibi check must not compare boolean values, string values or the numbers 0 and 1 when it looks for one quantity stated twice.

## Context

Booleans, strings and the numbers 0 and 1 are shared by most unrelated facts (every rule modeled as a count of failures is eq 0), so comparing them would bury the real pairs under noise.

## Source

> Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"