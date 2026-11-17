---
title: The quantity check skips booleans, strings, 0 and 1
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - check
  - quantity-duplicate
semantic_text: Kibi check must not compare boolean values, string values or the numbers 0 and 1 when it looks for one quantity stated twice. The numbers Kibi check treats as too trivial to compare shall be 0 and 1.
rationale: Booleans, strings and the numbers 0 and 1 are shared by most unrelated facts (every rule modeled as a count of failures is eq 0), so comparing them would bury the real pairs under noise.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T16:12:11.770Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8104bbf8bee28a9d0c4e9ee133a23d155a5be637891cd003e60752fe57820e95
semantic_inventory:
  - claim_key: CLAIM-9ADE78F0A7402DC4
    claim_text: Kibi check must not compare boolean values, string values or the numbers 0 and 1 when it looks for one quantity stated twice
    role: normative
    status: modeled
    span:
      start: 0
      end: 124
  - claim_key: CLAIM-D2CBDFD589DF53F1
    claim_text: The numbers Kibi check treats as too trivial to compare shall be 0 and 1
    role: normative
    status: modeled
    span:
      start: 126
      end: 198
logic_claims:
  - CLAIM-9ADE78F0A7402DC4
  - CLAIM-D2CBDFD589DF53F1
id: REQ-check-quantity-duplicate-trivial-values
type: req
semantic_clauses:
  - Kibi check must not compare boolean values, string values or the numbers 0 and 1 when it looks for one quantity stated twice.
  - The numbers Kibi check treats as too trivial to compare shall be 0 and 1.
---
Kibi check must not compare boolean values, string values or the numbers 0 and 1 when it looks for one quantity stated twice. The numbers Kibi check treats as too trivial to compare shall be 0 and 1.

## Context

Booleans, strings and the numbers 0 and 1 are shared by most unrelated facts (every rule modeled as a count of failures is eq 0), so comparing them would bury the real pairs under noise.

## Source

> Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"

Maintainer-approved addition (2026-11-17), stating the value as its own sentence so a certificate can prove it: "The numbers Kibi check treats as too trivial to compare shall be 0 and 1."
