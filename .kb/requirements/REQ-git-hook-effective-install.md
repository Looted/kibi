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
    status: ontology_gap
    span:
      start: 0
      end: 260
    reason: No deterministic strict-property or declared predicate grounding yet; kept explicit instead of treating prose as logic-complete.
  - claim_key: CLAIM-9D13628F3ADA9A84
    claim_text: from a subdirectory, must derive all project state from the repository root, and must install hooks into the repository-managed hooks directory. `kibi init` must report a per-hook installation result and must not announce success for a foreign hook that it left untouched
    role: normative
    status: ontology_gap
    span:
      start: 265
      end: 536
    reason: No deterministic strict-property or declared predicate grounding yet; kept explicit instead of treating prose as logic-complete.
id: REQ-git-hook-effective-install
type: req
links:
  - type: relates_to
    target: REQ-git-hook-sync-v2
---
`kibi init` and `kibi doctor` must resolve Git's effective hooks directory with `git rev-parse --git-path hooks` and install or diagnose hooks there instead of assuming `.git/hooks` under the current directory. `kibi init` must succeed inside a linked worktree and from a subdirectory, must derive all project state from the repository root, and must install hooks into the repository-managed hooks directory. `kibi init` must report a per-hook installation result and must not announce success for a foreign hook that it left untouched.
