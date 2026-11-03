---
id: REQ-cursor-worktree-kibi-continuity
title: Cursor worktree handoffs preserve Kibi continuity
status: open
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-07-21T00:00:00.000Z
priority: must
owner: cursor-team
tags:
  - cursor
  - worktree
  - mcp
  - cli
  - policy
  - review:context-missing
links:
  - type: relates_to
    target: ADR-022
  - type: specified_by
    target: SCEN-cursor-worktree-kibi-continuity
  - type: verified_by
    target: TEST-cursor-worktree-kibi-continuity
semantic_text: A Cursor worktree switch must not change the public Kibi surface that the user sees. Guidance for the active Cursor worktree must remain consistent with the same public operation model. Kibi continuity must survive branch and worktree movement without rewriting history.
logic_claims:
  - CLAIM-236E73D543C01E6B
  - CLAIM-61CDE81F638F30A0
  - CLAIM-2E63BD0D258B13EB
semantic_clauses:
  - A Cursor worktree switch must not change the public Kibi surface that the user sees.
  - Guidance for the active Cursor worktree must remain consistent with the same public operation model.
  - Kibi continuity must survive branch and worktree movement without rewriting history.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0cb292f7300cdc5d8f32cdcd5d0783f93b25af14a0df5817ef94fe9ba2ab9f3a
semantic_inventory:
  - claim_key: CLAIM-236E73D543C01E6B
    claim_text: A Cursor worktree switch must not change the public Kibi surface that the user sees
    role: normative
    status: modeled
    span:
      start: 0
      end: 83
  - claim_key: CLAIM-61CDE81F638F30A0
    claim_text: Guidance for the active Cursor worktree must remain consistent with the same public operation model
    role: normative
    status: modeled
    span:
      start: 85
      end: 184
  - claim_key: CLAIM-2E63BD0D258B13EB
    claim_text: Kibi continuity must survive branch and worktree movement without rewriting history
    role: normative
    status: modeled
    span:
      start: 186
      end: 269
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:34:18.000Z'
failure_side_waiver: "A continuity claim: a worktree switch keeps the same Kibi surface. Nothing is submitted for Kibi to refuse."
failure_side_waiver_approved_by: Piotr Franczyk
firmness: default
required_evidence: tested
---
- A Cursor worktree switch must not change the public Kibi surface that the user sees.
- Guidance for the active Cursor worktree must remain consistent with the same public operation model.
- Kibi continuity must survive branch and worktree movement without rewriting history.
