---
title: The proof workflow fails unless every contracted test has a receipt from one of its shards
status: open
priority: should
required_evidence: tested
tags:
  - proof
  - ci
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-17, approving the sharded proof and merge train statements: "Approve all."'
  approved_by: maintainer
  recorded_at: '2026-11-17T11:22:32.705Z'
rationale: Sharding must not make proof weaker. The evidence-floor gate accepts receipts committed earlier whose binding still matches, so a shard that failed, never reported or skipped a test could otherwise pass on old evidence. Checking that the shards add up to exactly one full run on this commit keeps the sharded proof as strong as a single kibi prove --all.
semantic_text: The proof workflow fails unless every contracted test has a receipt written on the proven snapshot by one of its shards.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7821a3ce3eda045a56a0b085b2a39dd55efdf8b26aaf525b3133ff5f016bbbc7
semantic_inventory:
  - claim_key: CLAIM-2CC1F9E506919B60
    claim_text: The proof workflow fails unless every contracted test has a receipt written on the proven snapshot by one of its shards
    role: exception
    status: modeled
    span:
      start: 0
      end: 119
logic_claims:
  - CLAIM-2CC1F9E506919B60
id: REQ-ci-proof-shards-cover-full-run
type: req
---
The proof workflow fails unless every contracted test has a receipt written on the proven snapshot by one of its shards.

## Context

Sharding must not make proof weaker. The evidence-floor gate accepts receipts committed earlier whose binding still matches, so a shard that failed, never reported or skipped a test could otherwise pass on old evidence. Checking that the shards add up to exactly one full run on this commit keeps the sharded proof as strong as a single kibi prove --all.

## Source

> Maintainer decision, 2026-11-17, approving the sharded proof and merge train statements: "Approve all."
