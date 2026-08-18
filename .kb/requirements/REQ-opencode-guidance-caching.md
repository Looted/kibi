---
id: REQ-opencode-guidance-caching
title: "OpenCode Guidance Caching"
status: open
created_at: 2026-05-13T00:00:00Z
source: packages/opencode/src/guidance-cache.ts
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - cache
links:
  - type: specified_by
    target: SCEN-opencode-guidance-caching
  - type: verified_by
    target: TEST-opencode-smart-enforcement
---

The plugin must maintain a cache for enforcement state and guidance context:

1. Invalidate cache on branch switches.
2. Invalidate cache on git worktree changes.
3. Invalidate cache when `.kb/config.json` or posture-relevant files change.
4. Support configurable TTL or event-based invalidation for guidance blocks.
