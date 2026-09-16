---
id: REQ-opencode-guidance-caching
title: OpenCode Guidance Caching
status: open
created_at: 2026-05-13T00:00:00.000Z
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
semantic_text: The plugin must maintain a cache for enforcement state and guidance context:\n\nInvalidate cache on branch switches.\nInvalidate cache on git worktree changes.\nInvalidate cache when `.kb/config.json` or posture-relevant files change.\nSupport configurable TTL or event-based invalidation for guidance blocks.
logic_claims:
  - CLAIM-92775AA5E43E3BD9
semantic_clauses:
  - The plugin must maintain a cache for enforcement state and guidance context:\n\nInvalidate cache on branch switches.\nInvalidate cache on git worktree changes.\nInvalidate cache when `.kb/config.json` or posture-relevant files change.\nSupport configurable TTL or event-based invalidation for guidance blocks
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b888b884a5b9f4678578ce047fef33f7245681d4eb9e252cc4168ab251ddedc6
semantic_inventory:
  - claim_key: CLAIM-92775AA5E43E3BD9
    claim_text: The plugin must maintain a cache for enforcement state and guidance context:\n\nInvalidate cache on branch switches.\nInvalidate cache on git worktree changes.\nInvalidate cache when `.kb/config.json` or posture-relevant files change.\nSupport configurable TTL or event-based invalidation for guidance blocks
    role: normative
    status: modeled
    span:
      start: 0
      end: 308
type: req
---

The plugin must maintain a cache for enforcement state and guidance context:

1. Invalidate cache on branch switches.
2. Invalidate cache on git worktree changes.
3. Invalidate cache when `.kb/config.json` or posture-relevant files change.
4. Support configurable TTL or event-based invalidation for guidance blocks.
