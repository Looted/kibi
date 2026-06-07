---
id: SCEN-opencode-guidance-caching
title: OpenCode Guidance Cache Invalidation
type: scenario
status: active
created_at: 2026-05-13T00:00:00Z
source: documentation/scenarios/SCEN-opencode-guidance-caching.md
priority: must
tags:
  - opencode
  - cache
links:
  - type: verified_by
    target: TEST-opencode-smart-enforcement
---

## Scenario: Guidance Cache Invalidation

**Given** posture-aware guidance has been cached for a workspace
**When** the branch, worktree, or posture-relevant config changes
**Then** the cache must be invalidated before the next guidance decision is reused.
