---
id: TEST-kibi-fresh-verification-receipts
title: Fresh snapshot-bound verification receipt tests
status: passing
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/tests/e2e/packed/fresh-verification-receipts.test.ts
tags: [requirements, proof, verification, receipts, prolog, cli, mcp, e2e]
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-RECEIPTS-20260810-01
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: >-
      tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/fresh-verification-receipts.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 3575856c125e0c295553661a049c7eafef56a740e5a03c667dbf6da4b5bea2d4
    environment_hash: 6e6bbcb607fdce2e1a5d110e1105c16eb85b14725f9323fa0fa5b372428db14e
    started_at: 2026-08-10T15:57:07.796Z
    finished_at: 2026-08-10T15:57:42.693Z
    artifact_digest: d931889ce55c62bb94c3084d7c78d7a026a691d46b426a0b5338ac4391781d01
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-RECEIPTS-20260810-02
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: >-
      tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/fresh-verification-receipts.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: ebcb72a6263ef4b2b7732572082d776c89b90085a1cf4c4ca440ba10fc30df11
    environment_hash: 6e6bbcb607fdce2e1a5d110e1105c16eb85b14725f9323fa0fa5b372428db14e
    started_at: 2026-08-10T16:12:21.775Z
    finished_at: 2026-08-10T16:12:57.750Z
    artifact_digest: 7204825a77b043f8acd29b3cd75a30138774434330c14676e367330ebb73a8ae
links:
  - type: validates
    target: SCEN-kibi-fresh-verification-receipts
---

Verifies receipt schema and history validation, append-only mutation and sync behavior, deterministic workspace snapshots, Prolog proof-state classification, durable-status non-authority, and CLI/MCP reporting parity.
