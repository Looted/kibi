---
id: SCEN-cursor-worktree-kibi-continuity
title: Cursor worktree handoff keeps Kibi continuity intact
type: scenario
status: active
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-21T00:00:00Z
source: documentation/scenarios/SCEN-cursor-worktree-kibi-continuity.md
priority: must
tags:
  - cursor
  - worktree
  - mcp
  - cli
  - policy
links:
  - type: relates_to
    target: REQ-cursor-worktree-kibi-continuity
  - type: relates_to
    target: ADR-022
---

## Scenario

A Cursor user switches to a different worktree on the same repo.

### Steps

1. The user opens the new worktree.
2. The user checks the public Kibi guidance in that worktree.
3. The guidance still reflects the same public operation model.

### Expected Outcomes

- Kibi continuity survives the worktree handoff.
- The user sees the same public surface model.
- History stays intact while the active worktree changes.
