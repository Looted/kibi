---
title: The merge train lands a train only when its checks passed on the exact assembled head
status: open
priority: should
required_evidence: tested
tags:
  - ci
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-17, approving the sharded proof and merge train statements: "Approve all."'
  approved_by: maintainer
  recorded_at: '2026-11-17T11:40:41.612Z'
rationale: Develop must only ever hold trees that passed CI and the strict proof. The train merges as a merge commit on the tip it was assembled on, so develop's tree is exactly the proven tree; a moved branch or base would merge a tree nothing proved, so the train is assembled again instead.
semantic_text: The merge train merges a train into develop only when the train pull request's required checks passed on the exact head it assembled.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d9ad9099f6c4c46f535ed4e4328cf31ae91f60ea2e44d11235b2482ab8b4f9cd
semantic_inventory:
  - claim_key: CLAIM-4C4A9D5A43F71FCA
    claim_text: The merge train merges a train into develop only when the train pull request's required checks passed on the exact head it assembled
    role: normative
    status: modeled
    span:
      start: 0
      end: 132
logic_claims:
  - CLAIM-4C4A9D5A43F71FCA
id: REQ-ci-merge-train-lands-assembled-head
type: req
---
The merge train merges a train into develop only when the train pull request's required checks passed on the exact head it assembled.

## Context

Develop must only ever hold trees that passed CI and the strict proof. The train merges as a merge commit on the tip it was assembled on, so develop's tree is exactly the proven tree; a moved branch or base would merge a tree nothing proved, so the train is assembled again instead.

## Source

> Maintainer decision, 2026-11-17, approving the sharded proof and merge train statements: "Approve all."
