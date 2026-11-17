---
title: A develop push reuses the proof of the merged train with the same files
status: open
priority: should
required_evidence: tested
tags:
  - ci
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-17, approving the sharded proof and merge train statements: "Approve all."'
  approved_by: maintainer
  recorded_at: '2026-11-17T11:52:26.528Z'
rationale: A landed train already proved the exact tree develop now has, so proving the push again costs a full proof run per train without adding evidence. The reuse rests on the same canonical snapshot check as pull request reuse, so a push whose files differ from the train's still runs the full proof.
semantic_text: A develop push reuses the proof of the train whose merged files it has.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d75ebe2dd46d106355510da91407997405307a4e9340e4dff424844ff7eb0ce6
semantic_inventory:
  - claim_key: CLAIM-DDD3A77B718BD347
    claim_text: A develop push reuses the proof of the train whose merged files it has
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 70
logic_claims:
  - CLAIM-DDD3A77B718BD347
id: REQ-ci-proof-reuse-train-merge
type: req
---
A develop push reuses the proof of the train whose merged files it has.

## Context

A landed train already proved the exact tree develop now has, so proving the push again costs a full proof run per train without adding evidence. The reuse rests on the same canonical snapshot check as pull request reuse, so a push whose files differ from the train's still runs the full proof.

## Source

> Maintainer decision, 2026-11-17, approving the sharded proof and merge train statements: "Approve all."
