---
title: Exact branch-local KB identity, same-identity storage migration and read-only detached HEAD snapshots
status: open
priority: must
tags:
  - git
  - branching
  - storage
  - recovery
  - exact-identity
  - detached-head
semantic_text: Kibi must use the exact active Git branch name as the branch-local KB identity. It must not normalize master to main, infer a default branch for a new store, or rename a Git branch. A missing exact branch store is created only on an explicit branch ensure. A damaged exact store is diagnosed without mutation and rebuilt only through a previewed, explicit recovery that preserves the previous bytes. Legacy migration may only convert a literal branch store to the hashed store for the same exact active Git branch identity. Every cross-identity pair, including main to master, must be refused. A detached HEAD with exactly one local branch at HEAD must attach that branch's KB. Read-only operations on a detached HEAD with zero or several local branches at HEAD must attach a read-only snapshot store compiled from the checkout's tracked sources. Every result served from the detached HEAD snapshot store must carry a detached_head_read_only warning naming the commit, the branches at HEAD, and the store path. Write operations and kibi sync on a detached HEAD with zero or several local branches at HEAD must be refused with a message naming git switch or KIBI_BRANCH.
semantic_clauses:
  - Kibi must use the exact active Git branch name as the branch-local KB identity.
  - It must not normalize master to main, infer a default branch for a new store, or rename a Git branch.
  - A missing exact branch store is created only on an explicit branch ensure.
  - A damaged exact store is diagnosed without mutation and rebuilt only through a previewed, explicit recovery that preserves the previous bytes.
  - Legacy migration may only convert a literal branch store to the hashed store for the same exact active Git branch identity.
  - Every cross-identity pair, including main to master, must be refused.
  - A detached HEAD with exactly one local branch at HEAD must attach that branch's KB.
  - Read-only operations on a detached HEAD with zero or several local branches at HEAD must attach a read-only snapshot store compiled from the checkout's tracked sources.
  - Every result served from the detached HEAD snapshot store must carry a detached_head_read_only warning naming the commit, the branches at HEAD, and the store path.
  - Write operations and kibi sync on a detached HEAD with zero or several local branches at HEAD must be refused with a message naming git switch or KIBI_BRANCH.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e611a9f7c6408f5c9a5098ebc427e7729b6193cdf04fa863e910f4f7345705a9
semantic_inventory:
  - claim_key: CLAIM-BFA707582FDA4263
    claim_text: Kibi must use the exact active Git branch name as the branch-local KB identity
    role: normative
    span:
      start: 0
      end: 78
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-3A485C91255E982A
    claim_text: It must not normalize master to main, infer a default branch for a new store, or rename a Git branch
    role: normative
    span:
      start: 80
      end: 180
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-540E77EE18088717
    claim_text: A missing exact branch store is created only on an explicit branch ensure
    role: descriptive
    span:
      start: 182
      end: 255
    status: modeled
    reason: Grounded by a strict property fact reviewed against the current code.
  - claim_key: CLAIM-6CC3B8DE2744A748
    claim_text: A damaged exact store is diagnosed without mutation and rebuilt only through a previewed, explicit recovery that preserves the previous bytes
    role: descriptive
    span:
      start: 257
      end: 398
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-3A65A655962C5ADA
    claim_text: Legacy migration may only convert a literal branch store to the hashed store for the same exact active Git branch identity
    role: normative
    span:
      start: 400
      end: 522
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-64ED01687C9C549E
    claim_text: Every cross-identity pair, including main to master, must be refused
    role: normative
    span:
      start: 524
      end: 592
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-3A3F394B6600B1F4
    claim_text: A detached HEAD with exactly one local branch at HEAD must attach that branch's KB
    role: normative
    span:
      start: 594
      end: 676
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-B615857DD8297373
    claim_text: Read-only operations on a detached HEAD with zero or several local branches at HEAD must attach a read-only snapshot store compiled from the checkout's tracked sources
    role: normative
    span:
      start: 678
      end: 845
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-C9AE01EB382F2593
    claim_text: Every result served from the detached HEAD snapshot store must carry a detached_head_read_only warning naming the commit, the branches at HEAD, and the store path
    role: normative
    span:
      start: 847
      end: 1009
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-1D06495FE053404E
    claim_text: Write operations and kibi sync on a detached HEAD with zero or several local branches at HEAD must be refused with a message naming git switch or KIBI_BRANCH
    role: normative
    span:
      start: 1011
      end: 1168
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-BFA707582FDA4263
  - CLAIM-3A485C91255E982A
  - CLAIM-540E77EE18088717
  - CLAIM-6CC3B8DE2744A748
  - CLAIM-3A65A655962C5ADA
  - CLAIM-64ED01687C9C549E
  - CLAIM-3A3F394B6600B1F4
  - CLAIM-B615857DD8297373
  - CLAIM-C9AE01EB382F2593
  - CLAIM-1D06495FE053404E
origin:
  kind: agent
  recorded_at: '2026-10-04T02:18:02.233Z'
id: REQ-branch-store-recovery-v4
type: req
---
Kibi must use the exact active Git branch name as the branch-local KB identity. It must not normalize master to main, infer a default branch for a new store, or rename a Git branch. A missing exact branch store is created only on an explicit branch ensure. A damaged exact store is diagnosed without mutation and rebuilt only through a previewed, explicit recovery that preserves the previous bytes. Legacy migration may only convert a literal branch store to the hashed store for the same exact active Git branch identity. Every cross-identity pair, including main to master, must be refused. A detached HEAD with exactly one local branch at HEAD must attach that branch's KB. Read-only operations on a detached HEAD with zero or several local branches at HEAD must attach a read-only snapshot store compiled from the checkout's tracked sources. Every result served from the detached HEAD snapshot store must carry a detached_head_read_only warning naming the commit, the branches at HEAD, and the store path. Write operations and kibi sync on a detached HEAD with zero or several local branches at HEAD must be refused with a message naming git switch or KIBI_BRANCH.

## Rationale

Kibi now answers questions on a CI checkout or any detached commit: on a bare SHA, search, query, status, check, coverage and graph read a snapshot of that checkout and say so in every answer, while writes are refused with the command that fixes it, and no branch KB is ever guessed or written (changeset `detached-reads-fast-sync-read-limits`). The superseded requirement said a missing store is created only on an explicit branch ensure; read operations on a detached HEAD now compile a snapshot store without one, so the store-creation clause is narrowed to exact branch stores and the detached HEAD behavior is stated explicitly. The identity, recovery and migration clauses carry over unchanged.
