---
title: A failed train is re-run once, then each half is proven separately
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
  recorded_at: '2026-11-17T11:40:44.956Z'
rationale: A flaky job would otherwise eject a good pull request and cost its author a new round, and dropping the newest pull request blames it without evidence. Re-running once absorbs a flake as a new run attempt, and halving localises a real failure to the pull request that fails on its own.
semantic_text: When a train's checks fail, the merge train re-runs the failed jobs once and then proves each half of the train separately, so no pull request is removed without evidence.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a94e1207d8f3e8da8c31079880635acae01df53185e65754a1844ce6a81b0556
semantic_inventory:
  - claim_key: CLAIM-2BEAF88E587E0FA0
    claim_text: When a train's checks fail, the merge train re-runs the failed jobs once and then proves each half of the train separately, so no pull request is removed without evidence
    role: condition
    status: modeled
    span:
      start: 0
      end: 170
logic_claims:
  - CLAIM-2BEAF88E587E0FA0
id: REQ-ci-merge-train-failure-bisect
type: req
---
When a train's checks fail, the merge train re-runs the failed jobs once and then proves each half of the train separately, so no pull request is removed without evidence.

## Context

A flaky job would otherwise eject a good pull request and cost its author a new round, and dropping the newest pull request blames it without evidence. Re-running once absorbs a flake as a new run attempt, and halving localises a real failure to the pull request that fails on its own.

## Source

> Maintainer decision, 2026-11-17, approving the sharded proof and merge train statements: "Approve all."
