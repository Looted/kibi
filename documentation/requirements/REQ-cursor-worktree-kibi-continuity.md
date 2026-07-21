---
id: REQ-cursor-worktree-kibi-continuity
title: Cursor worktree handoffs preserve Kibi continuity
status: open
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-21T00:00:00Z
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
---

Cursor worktree changes must preserve Kibi continuity across handoffs.

1. A worktree switch must not change the public Kibi surface that the user sees.
2. Guidance for the active worktree must remain consistent with the same public operation model.
3. Continuity requirements must survive branch and worktree movement without rewriting history.
