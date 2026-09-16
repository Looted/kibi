---
id: REQ-cursor-worktree-kibi-continuity
title: Cursor worktree handoffs preserve Kibi continuity
status: open
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-07-21T00:00:00.000Z
source: documentation/requirements/REQ-cursor-worktree-kibi-continuity.md
priority: must
owner: cursor-team
tags:
  - cursor
  - worktree
  - mcp
  - cli
  - policy
links:
  - type: relates_to
    target: ADR-022
  - type: specified_by
    target: SCEN-cursor-worktree-kibi-continuity
  - type: verified_by
    target: TEST-cursor-worktree-kibi-continuity
semantic_text: Cursor worktree changes must preserve Kibi continuity across handoffs.\n\nA worktree switch must not change the public Kibi surface that the user sees.\nGuidance for the active worktree must remain consistent with the same public operation model.\nContinuity requirements must survive branch and worktree movement without rewriting history.
logic_claims:
  - CLAIM-BAE70AB81519036A
semantic_clauses:
  - Cursor worktree changes must preserve Kibi continuity across handoffs.\n\nA worktree switch must not change the public Kibi surface that the user sees.\nGuidance for the active worktree must remain consistent with the same public operation model.\nContinuity requirements must survive branch and worktree movement without rewriting history
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bdb7ff25b733d37e0e5c738ef2245051dab8c0137997bc205fa434b65b596439
semantic_inventory:
  - claim_key: CLAIM-BAE70AB81519036A
    claim_text: Cursor worktree changes must preserve Kibi continuity across handoffs.\n\nA worktree switch must not change the public Kibi surface that the user sees.\nGuidance for the active worktree must remain consistent with the same public operation model.\nContinuity requirements must survive branch and worktree movement without rewriting history
    role: normative
    status: modeled
    span:
      start: 0
      end: 339
type: req
---

Cursor worktree changes must preserve Kibi continuity across handoffs.

1. A worktree switch must not change the public Kibi surface that the user sees.
2. Guidance for the active worktree must remain consistent with the same public operation model.
3. Continuity requirements must survive branch and worktree movement without rewriting history.
