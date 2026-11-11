---
title: Legacy branch stores migrate only to the same exact branch identity
status: open
semantic_text: Legacy migration may only convert a literal branch store to the hashed store for the same exact active Git branch identity. Every cross-identity pair, including main to master, must be refused.
semantic_clauses:
  - Legacy migration may only convert a literal branch store to the hashed store for the same exact active Git branch identity.
  - Every cross-identity pair, including main to master, must be refused.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9b4624955de1bb45ab4f39d8c1c2ed58e60b22be23d84614a15ab8683fdd55e9
semantic_inventory:
  - claim_key: CLAIM-3A65A655962C5ADA
    claim_text: Legacy migration may only convert a literal branch store to the hashed store for the same exact active Git branch identity
    role: normative
    status: modeled
    span:
      start: 0
      end: 122
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-64ED01687C9C549E
    claim_text: Every cross-identity pair, including main to master, must be refused
    role: normative
    status: modeled
    span:
      start: 124
      end: 192
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
logic_claims:
  - CLAIM-3A65A655962C5ADA
  - CLAIM-64ED01687C9C549E
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T04:44:01.521Z'
priority: must
required_evidence: tested
tags:
  - git
  - branching
  - storage
  - recovery
  - exact-identity
  - detached-head
id: REQ-kibi-branch-store-same-identity-migration
type: req
---
Legacy migration may only convert a literal branch store to the hashed store for the same exact active Git branch identity. Every cross-identity pair, including main to master, must be refused.

## Context

Upgrading old storage keeps each branch's knowledge on that branch, so main and master never merge by accident.



## Why this changed

Split from REQ-branch-store-recovery-v4, which held three behaviors: exact branch identity with explicit store creation and recovery, same-identity legacy migration, and read-only detached HEAD snapshots. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
