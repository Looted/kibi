---
title: Exact branch-local KB identity and same-identity storage migration
status: open
priority: must
tags:
  - git
  - branching
  - storage
  - recovery
  - exact-identity
links:
  - type: specified_by
    target: SCEN-branch-store-recovery
  - type: constrains
    target: FACT-KB-PER-BRANCH
  - type: requires_property
    target: FACT-BRANCH-CROSS-IDENTITY-MIGRATION-REFUSED
  - type: requires_property
    target: FACT-EXACT-BRANCH-IDENTITY-SOURCE
  - type: requires_property
    target: FACT-EXACT-BRANCH-INITIALIZATION-MODE
  - type: requires_predicate
    target: FACT-BRANCH-STORE-SAME-IDENTITY-MIGRATION
  - type: requires_predicate
    target: FACT-PRED-1B6C15026E81
  - type: requires_predicate
    target: FACT-PRED-D62E80F439F2
  - type: supersedes
    target: REQ-branch-store-recovery-v2
semantic_text: Kibi must use the exact active Git branch name as the branch-local KB identity. It must not normalize master to main, infer a default branch for a new store, or rename a Git branch. A missing exact store is created only on an explicit branch ensure. A damaged exact store is diagnosed without mutation and rebuilt only through a previewed, explicit recovery that preserves the previous bytes. Legacy migration may only convert a literal branch store to the hashed store for the same exact active Git branch identity. Every cross-identity pair, including main to master, must be refused.
semantic_clauses:
  - Kibi must use the exact active Git branch name as the branch-local KB identity.
  - It must not normalize master to main, infer a default branch for a new store, or rename a Git branch.
  - A missing exact store is created only on an explicit branch ensure.
  - A damaged exact store is diagnosed without mutation and rebuilt only through a previewed, explicit recovery that preserves the previous bytes.
  - Legacy migration may only convert a literal branch store to the hashed store for the same exact active Git branch identity.
  - Every cross-identity pair, including main to master, must be refused.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 603063928ec9bdced19abb34152bde91c465212032a0b1295758c7f1cf44c1de
logic_claims:
  - CLAIM-BFA707582FDA4263
  - CLAIM-3A485C91255E982A
  - CLAIM-339792C9B3635D5D
  - CLAIM-6CC3B8DE2744A748
  - CLAIM-3A65A655962C5ADA
  - CLAIM-64ED01687C9C549E
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
    reason: Grounded by the exact forbidden branch identity transformations.
  - claim_key: CLAIM-339792C9B3635D5D
    claim_text: A missing exact store is created only on an explicit branch ensure
    role: descriptive
    status: modeled
    span:
      start: 182
      end: 248
    reason: Grounded as explicit branch-ensure initialization mode.
  - claim_key: CLAIM-6CC3B8DE2744A748
    claim_text: A damaged exact store is diagnosed without mutation and rebuilt only through a previewed, explicit recovery that preserves the previous bytes
    role: descriptive
    status: modeled
    span:
      start: 250
      end: 391
    reason: Grounded by the explicit recovery policy and byte-preservation arguments.
  - claim_key: CLAIM-3A65A655962C5ADA
    claim_text: Legacy migration may only convert a literal branch store to the hashed store for the same exact active Git branch identity
    role: normative
    status: modeled
    span:
      start: 393
      end: 515
    reason: Grounded by the same-exact-identity literal-to-hashed migration predicate.
  - claim_key: CLAIM-64ED01687C9C549E
    claim_text: Every cross-identity pair, including main to master, must be refused
    role: normative
    status: modeled
    span:
      start: 517
      end: 585
    reason: Grounded by cross_identity_migration_allowed=false on the canonical branch subject.
id: REQ-branch-store-recovery-v3
type: req
---
Kibi must use the exact active Git branch name as the branch-local KB identity. It must not normalize master to main, infer a default branch for a new store, or rename a Git branch. A missing exact store is created only on an explicit branch ensure. A damaged exact store is diagnosed without mutation and rebuilt only through a previewed, explicit recovery that preserves the previous bytes. Legacy migration may only convert a literal branch store to the hashed store for the same exact active Git branch identity. Every cross-identity pair, including main to master, must be refused.
