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
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-opencode-guidance-caching
  - type: verified_by
    target: TEST-opencode-smart-enforcement
semantic_text: The OpenCode plugin must cache enforcement state and guidance context. The OpenCode plugin must invalidate its guidance cache on a branch switch. The OpenCode plugin must keep guidance cached for one git worktree from applying to another. The OpenCode plugin must invalidate its guidance cache when .kb/manifest.json or the workspace posture changes. The OpenCode plugin must expire cached guidance after a configurable time to live.
logic_claims:
  - CLAIM-152CB2534D8EA349
  - CLAIM-23FE612FBC06A7F2
  - CLAIM-8E9304A784CD2FD6
  - CLAIM-E7B129CC05192C7A
  - CLAIM-BA66C33DECC223DF
semantic_clauses:
  - The OpenCode plugin must cache enforcement state and guidance context.
  - The OpenCode plugin must invalidate its guidance cache on a branch switch.
  - The OpenCode plugin must keep guidance cached for one git worktree from applying to another.
  - The OpenCode plugin must invalidate its guidance cache when .kb/manifest.json or the workspace posture changes.
  - The OpenCode plugin must expire cached guidance after a configurable time to live.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d7a9d9d2e1f2df52d6324c89fe7db4ce85fdb4879eaba4c0e1cfd2c02a141ed5
semantic_inventory:
  - claim_key: CLAIM-152CB2534D8EA349
    claim_text: The OpenCode plugin must cache enforcement state and guidance context
    role: normative
    status: modeled
    span:
      start: 0
      end: 69
  - claim_key: CLAIM-23FE612FBC06A7F2
    claim_text: The OpenCode plugin must invalidate its guidance cache on a branch switch
    role: normative
    status: modeled
    span:
      start: 71
      end: 144
  - claim_key: CLAIM-8E9304A784CD2FD6
    claim_text: The OpenCode plugin must keep guidance cached for one git worktree from applying to another
    role: normative
    status: modeled
    span:
      start: 146
      end: 237
  - claim_key: CLAIM-E7B129CC05192C7A
    claim_text: The OpenCode plugin must invalidate its guidance cache when .kb/manifest.json or the workspace posture changes
    role: normative
    status: modeled
    span:
      start: 239
      end: 349
  - claim_key: CLAIM-BA66C33DECC223DF
    claim_text: The OpenCode plugin must expire cached guidance after a configurable time to live
    role: normative
    status: modeled
    span:
      start: 351
      end: 432
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:35:21.000Z'
firmness: default
required_evidence: tested
rationale: "Recomputing guidance on every turn is slow, but stale guidance from another branch or worktree is wrong, so the cache is invalidated on exactly those changes."
---
- The OpenCode plugin must cache enforcement state and guidance context.
- The OpenCode plugin must invalidate its guidance cache on a branch switch.
- The OpenCode plugin must keep guidance cached for one git worktree from applying to another.
- The OpenCode plugin must invalidate its guidance cache when .kb/manifest.json or the workspace posture changes.
- The OpenCode plugin must expire cached guidance after a configurable time to live.
