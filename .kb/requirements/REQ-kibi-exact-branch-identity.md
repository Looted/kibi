---
title: Each Git branch has exactly one KB store, created and recovered only on request
status: open
semantic_text: Kibi must use the exact active Git branch name as the branch-local KB identity. It must not normalize master to main, infer a default branch for a new store, or rename a Git branch. A missing exact branch store is created only on an explicit branch ensure. A damaged exact store is diagnosed without mutation and rebuilt only through a previewed, explicit recovery that preserves the previous bytes.
semantic_clauses:
  - Kibi must use the exact active Git branch name as the branch-local KB identity.
  - It must not normalize master to main, infer a default branch for a new store, or rename a Git branch.
  - A missing exact branch store is created only on an explicit branch ensure.
  - A damaged exact store is diagnosed without mutation and rebuilt only through a previewed, explicit recovery that preserves the previous bytes.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a9c260b5182f2d4090490ad10390efad0ff6593d78867d1af3070dd77e411d9a
semantic_inventory:
  - claim_key: CLAIM-BFA707582FDA4263
    claim_text: Kibi must use the exact active Git branch name as the branch-local KB identity
    role: normative
    status: modeled
    span:
      start: 0
      end: 78
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-3A485C91255E982A
    claim_text: It must not normalize master to main, infer a default branch for a new store, or rename a Git branch
    role: normative
    status: modeled
    span:
      start: 80
      end: 180
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-540E77EE18088717
    claim_text: A missing exact branch store is created only on an explicit branch ensure
    role: descriptive
    status: modeled
    span:
      start: 182
      end: 255
    reason: Grounded by a strict property fact reviewed against the current code.
  - claim_key: CLAIM-6CC3B8DE2744A748
    claim_text: A damaged exact store is diagnosed without mutation and rebuilt only through a previewed, explicit recovery that preserves the previous bytes
    role: descriptive
    status: modeled
    span:
      start: 257
      end: 398
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
logic_claims:
  - CLAIM-BFA707582FDA4263
  - CLAIM-3A485C91255E982A
  - CLAIM-540E77EE18088717
  - CLAIM-6CC3B8DE2744A748
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T04:42:49.803Z'
priority: must
required_evidence: tested
tags:
  - git
  - branching
  - storage
  - recovery
  - exact-identity
  - detached-head
id: REQ-kibi-exact-branch-identity
type: req
---
Kibi must use the exact active Git branch name as the branch-local KB identity. It must not normalize master to main, infer a default branch for a new store, or rename a Git branch. A missing exact branch store is created only on an explicit branch ensure. A damaged exact store is diagnosed without mutation and rebuilt only through a previewed, explicit recovery that preserves the previous bytes.

## Context

A branch's knowledge never silently becomes another branch's, and a broken store is never overwritten before a person sees the recovery. A new branch does not copy the default branch's KB when it is first checked out: kibi branch ensure creates an empty store for the exact branch, and sync compiles it from that checkout's tracked sources.



## Why this changed

Split from REQ-branch-store-recovery-v4, which held three behaviors: exact branch identity with explicit store creation and recovery, same-identity legacy migration, and read-only detached HEAD snapshots. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
