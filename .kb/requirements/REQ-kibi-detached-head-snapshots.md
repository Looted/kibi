---
title: A detached HEAD reads from a read-only snapshot and refuses writes
status: open
semantic_text: A detached HEAD with exactly one local branch at HEAD must attach that branch's KB. Read-only operations on a detached HEAD with zero or several local branches at HEAD must attach a read-only snapshot store compiled from the checkout's tracked sources. Every result served from the detached HEAD snapshot store must carry a detached_head_read_only warning naming the commit, the branches at HEAD, and the store path. Write operations and kibi sync on a detached HEAD with zero or several local branches at HEAD must be refused with a message naming git switch or KIBI_BRANCH.
semantic_clauses:
  - A detached HEAD with exactly one local branch at HEAD must attach that branch's KB.
  - Read-only operations on a detached HEAD with zero or several local branches at HEAD must attach a read-only snapshot store compiled from the checkout's tracked sources.
  - Every result served from the detached HEAD snapshot store must carry a detached_head_read_only warning naming the commit, the branches at HEAD, and the store path.
  - Write operations and kibi sync on a detached HEAD with zero or several local branches at HEAD must be refused with a message naming git switch or KIBI_BRANCH.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5cc9fb57e1768f3f74dea477dd470a69c753e2e93b7a3d67c9ad3c5cd1bc34e8
semantic_inventory:
  - claim_key: CLAIM-3A3F394B6600B1F4
    claim_text: A detached HEAD with exactly one local branch at HEAD must attach that branch's KB
    role: normative
    status: modeled
    span:
      start: 0
      end: 82
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-B615857DD8297373
    claim_text: Read-only operations on a detached HEAD with zero or several local branches at HEAD must attach a read-only snapshot store compiled from the checkout's tracked sources
    role: normative
    status: modeled
    span:
      start: 84
      end: 251
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-C9AE01EB382F2593
    claim_text: Every result served from the detached HEAD snapshot store must carry a detached_head_read_only warning naming the commit, the branches at HEAD, and the store path
    role: normative
    status: modeled
    span:
      start: 253
      end: 415
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-1D06495FE053404E
    claim_text: Write operations and kibi sync on a detached HEAD with zero or several local branches at HEAD must be refused with a message naming git switch or KIBI_BRANCH
    role: normative
    status: modeled
    span:
      start: 417
      end: 574
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-3A3F394B6600B1F4
  - CLAIM-B615857DD8297373
  - CLAIM-C9AE01EB382F2593
  - CLAIM-1D06495FE053404E
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T04:44:29.804Z'
priority: must
required_evidence: tested
tags:
  - git
  - branching
  - storage
  - recovery
  - exact-identity
  - detached-head
id: REQ-kibi-detached-head-snapshots
type: req
---
A detached HEAD with exactly one local branch at HEAD must attach that branch's KB. Read-only operations on a detached HEAD with zero or several local branches at HEAD must attach a read-only snapshot store compiled from the checkout's tracked sources. Every result served from the detached HEAD snapshot store must carry a detached_head_read_only warning naming the commit, the branches at HEAD, and the store path. Write operations and kibi sync on a detached HEAD with zero or several local branches at HEAD must be refused with a message naming git switch or KIBI_BRANCH.

## Context

CI checkouts on a bare commit can still read Kibi, but nothing they do changes any branch's knowledge.



## Why this changed

Split from REQ-branch-store-recovery-v4, which held three behaviors: exact branch identity with explicit store creation and recovery, same-identity legacy migration, and read-only detached HEAD snapshots. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
