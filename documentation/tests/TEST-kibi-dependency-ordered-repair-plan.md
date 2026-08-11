---
id: TEST-kibi-dependency-ordered-repair-plan
title: Packed dependency-ordered repair plan tests
status: passing
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/tests/TEST-kibi-dependency-ordered-repair-plan.md
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-REPAIR-PLAN-20260810-01
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/dependency-ordered-repair-plan.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 68131fba9962716408e6bf6aa60dfc87b86a6c4eacdf83e623edd51ecf2714b8
    environment_hash: 5d577f4411c4423b228da7556130dc175e2c00cf1e50e4d9608f6720e9d140f5
    started_at: 2026-08-10T18:20:28.253Z
    finished_at: 2026-08-10T18:20:59.811Z
    artifact_digest: 1ab7494688bc1609e7ba32a26b73af1ea6c93de6ff4d9316f5c1ae495af940e2
tags: [requirements, proof, repair, migration, packed, e2e]
links:
  - type: validates
    target: SCEN-kibi-dependency-ordered-repair-plan
---

Exercises `kibi.repair-plan.v1` through a fresh packed CLI installation, including dependency ordering, pagination fail-closed behavior, stable plan identity, requirement-only scope, table rendering, and read-only KB state.
