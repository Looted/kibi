---
title: Scripts coverage shard selects complete tests with process isolation
status: open
priority: must
tags:
  - coverage
  - testing
  - scripts
  - ci
text_ref: scripts/run-unit-coverage.ts
semantic_text: For the scripts coverage shard, the runner must list every recursively discovered scripts/tests path matching the test/spec filename pattern. The scripts coverage shard must include test/root-summary.test.ts exactly once after those paths. The scripts coverage shard must request process-per-file isolation.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e1a0fbcadc97709b1a3064e5385b7c9a98a93af41688031275c4ceacf2692c02
semantic_inventory:
  - claim_key: CLAIM-17AEE6FEA77C9AA3
    claim_text: For the scripts coverage shard, the runner must list every recursively discovered scripts/tests path matching the test/spec filename pattern
    role: normative
    status: modeled
    span:
      start: 0
      end: 140
  - claim_key: CLAIM-C32C177216B13299
    claim_text: The scripts coverage shard must include test/root-summary.test.ts exactly once after those paths
    role: normative
    status: modeled
    span:
      start: 142
      end: 238
  - claim_key: CLAIM-AD1CF1BBAF11A743
    claim_text: The scripts coverage shard must request process-per-file isolation
    role: normative
    status: modeled
    span:
      start: 240
      end: 306
semantic_clauses:
  - For the scripts coverage shard, the runner must list every recursively discovered scripts/tests path matching the test/spec filename pattern
  - The scripts coverage shard must include test/root-summary.test.ts exactly once after those paths
  - The scripts coverage shard must request process-per-file isolation
logic_claims:
  - CLAIM-17AEE6FEA77C9AA3
  - CLAIM-C32C177216B13299
  - CLAIM-AD1CF1BBAF11A743
id: REQ-scripts-coverage-shard-isolation
type: req
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 4): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
failure_side_waiver: "The claims describe a static shard configuration (which paths, process isolation, one summary test); the runner refuses nothing."
failure_side_waiver_approved_by: Piotr Franczyk
firmness: default
required_evidence: tested
---
For the scripts coverage shard, the runner must list every recursively discovered scripts/tests path matching the test/spec filename pattern. The scripts coverage shard must include test/root-summary.test.ts exactly once after those paths. The scripts coverage shard must request process-per-file isolation.

## Why
Three subprocess tests hit the time limit with empty output in the shared Bun coverage process, but finished quickly on their own. Running each scripts test file in its own process keeps the full test set and the 15-second limit. Source: docs/swipl-bundle-spike.md; commit "repair native spike environments and CI isolation".
