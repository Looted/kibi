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
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
For the scripts coverage shard, the runner must list every recursively discovered scripts/tests path matching the test/spec filename pattern. The scripts coverage shard must include test/root-summary.test.ts exactly once after those paths. The scripts coverage shard must request process-per-file isolation.
