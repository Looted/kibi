---
id: TEST-kibi-legacy-migration-preview
title: Legacy migration preview vertical-slice tests
status: passing
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: documentation/tests/TEST-kibi-legacy-migration-preview.md
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-LEGACY-MIGRATION-20260811-01
    test_id: TEST-kibi-legacy-migration-preview
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/dependency-ordered-repair-plan.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 77ee4c35ae4d93e9685624daef46597c617044a0e707baece9388bd6a1b327f1
    environment_hash: 637756e81846b777cf85b7133d405ff21179312077ee36a2c634adfae3e29c8f
    started_at: 2026-08-11T06:34:11.960Z
    finished_at: 2026-08-11T06:34:44.103Z
    artifact_digest: 70896c1e6ce4c01d4a900247ea688ee5d859564f362208cb31518764199b24e7
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-LEGACY-MIGRATION-20260811-02
    test_id: TEST-kibi-legacy-migration-preview
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/dependency-ordered-repair-plan.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: cc8b386243cb6b1e2a1de169d523d72bffa52d7986679111ad8788366047d487
    environment_hash: 637756e81846b777cf85b7133d405ff21179312077ee36a2c634adfae3e29c8f
    started_at: 2026-08-11T06:38:56.998Z
    finished_at: 2026-08-11T06:39:29.074Z
    artifact_digest: a82ebb484cf7b168f7661d21d5c017dcd1b24404b3ce530c494b66f51da1e80e
tags: [requirements, migration, semantics, source-binding, packed, e2e]
links:
  - type: validates
    target: SCEN-kibi-legacy-migration-preview
---

Exercises `kibi.legacy-migration-plan.v1` through focused CLI and MCP integration tests plus a fresh packed CLI installation, including deterministic pagination, exact source hashes and spans, schema provenance, conflict blocking, and read-only behavior.
