---
title: Install and diagnose Git hooks at the effective repository path
status: open
priority: must
tags:
  - git
  - hooks
  - worktree
semantic_text: '`kibi init` and `kibi doctor` must resolve Git''s effective hooks directory with `git rev-parse --git-path hooks` and install or diagnose hooks there instead of assuming `.git/hooks` under the current directory. `kibi init` must succeed inside a linked worktree and from a subdirectory, must derive all project state from the repository root, and must install hooks into the repository-managed hooks directory. `kibi init` must report a per-hook installation result and must not announce success for a foreign hook that it left untouched.'
semantic_clauses:
  - '`kibi init` and `kibi doctor` must resolve Git''s effective hooks directory with `git rev-parse --git-path hooks` and install or diagnose hooks there instead of assuming `.git/hooks` under the current directory. `kibi init` must succeed inside a linked worktree'
  - from a subdirectory, must derive all project state from the repository root, and must install hooks into the repository-managed hooks directory. `kibi init` must report a per-hook installation result and must not announce success for a foreign hook that it left untouched
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ef6119cce7f5976900348b313c23d438fb111a3b1d53edb5a028a3f7d25a9cdd
logic_claims:
  - CLAIM-7FBA2ADB25083C8E
  - CLAIM-9D13628F3ADA9A84
semantic_inventory:
  - claim_key: CLAIM-7FBA2ADB25083C8E
    claim_text: '`kibi init` and `kibi doctor` must resolve Git''s effective hooks directory with `git rev-parse --git-path hooks` and install or diagnose hooks there instead of assuming `.git/hooks` under the current directory. `kibi init` must succeed inside a linked worktree'
    role: normative
    status: modeled
    span:
      start: 0
      end: 260
  - claim_key: CLAIM-9D13628F3ADA9A84
    claim_text: from a subdirectory, must derive all project state from the repository root, and must install hooks into the repository-managed hooks directory. `kibi init` must report a per-hook installation result and must not announce success for a foreign hook that it left untouched
    role: normative
    status: modeled
    span:
      start: 265
      end: 536
id: REQ-git-hook-effective-install
type: req
links:
  - type: relates_to
    target: REQ-git-hook-sync-v2
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 6): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---
`kibi init` and `kibi doctor` must resolve Git's effective hooks directory with `git rev-parse --git-path hooks` and install or diagnose hooks there instead of assuming `.git/hooks` under the current directory. `kibi init` must succeed inside a linked worktree and from a subdirectory, must derive all project state from the repository root, and must install hooks into the repository-managed hooks directory. `kibi init` must report a per-hook installation result and must not announce success for a foreign hook that it left untouched.

## Why
Init assumed `.git/hooks` under the current directory. That broke in subdirectories and linked worktrees, and it ignored `core.hooksPath`. Init also claimed success for a foreign hook it had left untouched. Source: PR 281.
