---
title: Contradiction review candidate limits
status: open
priority: must
firmness: firm
semantic_text: The minimum contradiction review candidate score shall be 0.1. Contradiction review shall list at most 5 candidates.
semantic_clauses:
  - The minimum contradiction review candidate score shall be 0.1.
  - Contradiction review shall list at most 5 candidates.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:43:00.099Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1d8f099785e68cd7ea39bfb72a108571527891d374a6a53b62b5806835e24a07
semantic_inventory:
  - claim_key: CLAIM-9C053936BB885A8E
    claim_text: The minimum contradiction review candidate score shall be 0.1
    role: normative
    status: modeled
    span:
      start: 0
      end: 61
  - claim_key: CLAIM-2CA8BAB8AAE97CF4
    claim_text: Contradiction review shall list at most 5 candidates
    role: normative
    status: modeled
    span:
      start: 63
      end: 115
logic_claims:
  - CLAIM-9C053936BB885A8E
  - CLAIM-2CA8BAB8AAE97CF4
id: REQ-kibi-contradiction-review-limits
type: req
---
The minimum contradiction review candidate score shall be 0.1. Contradiction review shall list at most 5 candidates.

## Context

packages/cli/src/operations/planning/conflict-review.ts bounds the review candidates REQ-kibi-contradiction-review-candidates describes: a candidate needs at least the minimum score and the list is cut at the maximum count. Both are stated here so they are proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"