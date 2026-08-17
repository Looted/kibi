---
id: REQ-branch-store-recovery-v2
title: Exact branch-local KB identity and recoverable storage
status: open
priority: must
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9f9b2b4cf03af22a00d309eb73e9e04c2ad7b333b23cc555425b3f1e536ecc58
semantic_text: Kibi must use the exact active Git branch name as the branch-local KB identity. It must not normalize master to main, infer a default branch for a new store, or rename a Git branch. A missing exact store is created only on an explicit branch ensure; a damaged exact store is diagnosed without mutation and rebuilt only through a previewed, explicit recovery that preserves the previous bytes. The historical master to legacy main store migration is a single compatibility workflow and must reject arbitrary cross-branch moves.
logic_claims:
  - CLAIM-BFA707582FDA4263
  - CLAIM-3A485C91255E982A
  - CLAIM-339792C9B3635D5D
  - CLAIM-6CC3B8DE2744A748
  - CLAIM-449AE98BAC3BD69C
semantic_inventory:
  - claim_key: CLAIM-BFA707582FDA4263
    claim_text: Kibi must use the exact active Git branch name as the branch-local KB identity
    role: normative
    status: modeled
    span:
      start: 0
      end: 78
    reason: Grounded as exact active Git branch identity source.
  - claim_key: CLAIM-3A485C91255E982A
    claim_text: It must not normalize master to main, infer a default branch for a new store, or rename a Git branch
    role: normative
    status: modeled
    span:
      start: 80
      end: 180
    reason: Grounded with the reviewed branch identity transformation policy and exact prohibited set.
  - claim_key: CLAIM-339792C9B3635D5D
    claim_text: A missing exact store is created only on an explicit branch ensure
    role: descriptive
    status: modeled
    span:
      start: 182
      end: 248
    reason: Grounded as explicit branch-ensure initialization mode on the canonical branch subject.
  - claim_key: CLAIM-6CC3B8DE2744A748
    claim_text: a damaged exact store is diagnosed without mutation and rebuilt only through a previewed, explicit recovery that preserves the previous bytes
    role: descriptive
    status: modeled
    span:
      start: 250
      end: 391
    reason: Grounded with the reviewed damaged-store recovery predicate and exact recovery arguments.
  - claim_key: CLAIM-449AE98BAC3BD69C
    claim_text: The historical master to legacy main store migration is a single compatibility workflow and must reject arbitrary cross-branch moves
    role: normative
    status: modeled
    span:
      start: 393
      end: 525
    reason: Grounded with the reviewed role-explicit compatibility migration boundary predicate.
tags:
  - git
  - branching
  - storage
  - recovery
links:
  - type: specified_by
    target: SCEN-branch-store-recovery
semantic_clauses:
  - Kibi must use the exact active Git branch name as the branch-local KB identity.
  - It must not normalize master to main, infer a default branch for a new store, or rename a Git branch.
  - A missing exact store is created only on an explicit branch ensure.
  - a damaged exact store is diagnosed without mutation and rebuilt only through a previewed, explicit recovery that preserves the previous bytes.
  - The historical master to legacy main store migration is a single compatibility workflow and must reject arbitrary cross-branch moves.
type: req
---

Kibi must use the exact active Git branch name as the branch-local KB identity. It must not normalize master to main, infer a default branch for a new store, or rename a Git branch. A missing exact store is created only on an explicit branch ensure; a damaged exact store is diagnosed without mutation and rebuilt only through a previewed, explicit recovery that preserves the previous bytes. The historical master to legacy main store migration is a single compatibility workflow and must reject arbitrary cross-branch moves.
