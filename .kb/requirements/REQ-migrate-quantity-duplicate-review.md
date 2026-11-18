---
title: Kibi migrate lists one quantity stated twice as a review action
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - check
  - quantity-duplicate
semantic_text: Kibi migrate must list each pair of value facts that state one quantity twice as a review action.
rationale: 'Whether two facts are one quantity is a person''s call: folding them can merge two real limits, and writing distinct_from automatically would record a stale twin as intended. The upgrade that turns the blocking rule on has to hand the pairs over instead of deciding them.'
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T16:10:26.712Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f17ac1a59f997a2617c9ba59d642d5b4f7b67d45901a0fb8b3f1d2736c4b221a
semantic_inventory:
  - claim_key: CLAIM-0C25598460520217
    claim_text: Kibi migrate must list each pair of value facts that state one quantity twice as a review action
    role: normative
    status: modeled
    span:
      start: 0
      end: 96
logic_claims:
  - CLAIM-0C25598460520217
id: REQ-migrate-quantity-duplicate-review
type: req
---
Kibi migrate must list each pair of value facts that state one quantity twice as a review action.

## Context

Whether two facts are one quantity is a person's call: folding them can merge two real limits, and writing distinct_from automatically would record a stale twin as intended. The upgrade that turns the blocking rule on has to hand the pairs over instead of deciding them.

## Source

> Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"