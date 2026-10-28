---
title: The agent requirement review queue lists at most 25 requirements
status: open
priority: must
firmness: firm
semantic_text: The agent requirement review queue shall list at most 25 requirements.
semantic_clauses:
  - The agent requirement review queue shall list at most 25 requirements.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:36:10.016Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 568883eb25987545966fb652dd3fce3c1e4c1f6777773c86d5ec78bc373616c8
semantic_inventory:
  - claim_key: CLAIM-75316AACB6C1F49E
    claim_text: The agent requirement review queue shall list at most 25 requirements
    role: normative
    status: modeled
    span:
      start: 0
      end: 69
logic_claims:
  - CLAIM-75316AACB6C1F49E
id: REQ-kibi-agent-requirement-review-limit
type: req
---
The agent requirement review queue shall list at most 25 requirements.

## Context

AGENT_REQUIREMENT_REVIEW_LIMIT in packages/cli/src/public/operations/origin-review.ts bounds the review queue REQ-kibi-entity-origin describes: kb_check lists that many agent-authored requirements without origin.approved_by by id, then one summary finding, so a large agent-authored KB yields a bounded queue. The bound is stated here so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"