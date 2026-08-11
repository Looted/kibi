---
id: TEST-kibi-legacy-migration-preview-v2
title: Semantic source separation packed vertical-slice tests
status: passing
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: documentation/tests/TEST-kibi-legacy-migration-preview-v2.md
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-SEMANTIC-SOURCE-20260811-01
    test_id: TEST-kibi-legacy-migration-preview-v2
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/semantic-source-separation.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 48364be5e5eaf15cbb2a5e48e0940fa7e72df34c03c01450594814436670cf59
    environment_hash: 5d577f4411c4423b228da7556130dc175e2c00cf1e50e4d9608f6720e9d140f5
    started_at: 2026-08-11T07:36:09.485Z
    finished_at: 2026-08-11T07:36:51.130Z
    artifact_digest: 5e6d47250730d18deef0df05eb3fe206a08758e781b2894cc171ecc51b5da80b
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-SEMANTIC-SOURCE-20260811-02
    test_id: TEST-kibi-legacy-migration-preview-v2
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/semantic-source-separation.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 06a922eb7ea9d3267ee31eb87906df33498ef72970bd0e65ef512ba2594d4976
    environment_hash: 5d577f4411c4423b228da7556130dc175e2c00cf1e50e4d9608f6720e9d140f5
    started_at: 2026-08-11T07:50:14.701Z
    finished_at: 2026-08-11T07:51:26.101Z
    artifact_digest: 466490619c32dbc9491c1fceab1f9c85a9eeb6bd76953b5c90fe4d15cc973f9a
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-SEMANTIC-SOURCE-20260811-03
    test_id: TEST-kibi-legacy-migration-preview-v2
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/semantic-source-separation.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 73a0f7cef16180ca363f5268b794a0cf9b83a34fbd1d7ecacfcf45ded219639b
    environment_hash: 5d577f4411c4423b228da7556130dc175e2c00cf1e50e4d9608f6720e9d140f5
    started_at: 2026-08-11T08:01:27.706Z
    finished_at: 2026-08-11T08:01:57.654Z
    artifact_digest: d44cb38c82ead631c76b2a8e952e87e238c524ce3b26108f710f1b804b6989c3
tags: [requirements, migration, semantics, source-binding, packed, e2e]
links:
  - type: validates
    target: SCEN-kibi-legacy-migration-preview-v2
---

Exercises semantic-source separation through focused CLI, Core, and MCP contract tests plus a fresh packed installation. It proves that authored prose is persisted and previewed through `semantic_text`, independent `text_ref` evidence is retained, semantic source drift fails closed, CLI and MCP return equivalent plans, and preview calls do not mutate source or KB state.
