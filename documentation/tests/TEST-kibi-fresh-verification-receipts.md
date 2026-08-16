---
title: Fresh snapshot-bound verification receipt tests
status: passing
tags:
  - requirements
  - proof
  - verification
  - receipts
  - prolog
  - cli
  - mcp
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-RECEIPTS-20260810-01
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/fresh-verification-receipts.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 3575856c125e0c295553661a049c7eafef56a740e5a03c667dbf6da4b5bea2d4
    environment_hash: 6e6bbcb607fdce2e1a5d110e1105c16eb85b14725f9323fa0fa5b372428db14e
    started_at: '2026-08-10T15:57:07.796Z'
    finished_at: '2026-08-10T15:57:42.693Z'
    artifact_digest: d931889ce55c62bb94c3084d7c78d7a026a691d46b426a0b5338ac4391781d01
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-RECEIPTS-20260810-02
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/fresh-verification-receipts.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: ebcb72a6263ef4b2b7732572082d776c89b90085a1cf4c4ca440ba10fc30df11
    environment_hash: 6e6bbcb607fdce2e1a5d110e1105c16eb85b14725f9323fa0fa5b372428db14e
    started_at: '2026-08-10T16:12:21.775Z'
    finished_at: '2026-08-10T16:12:57.750Z'
    artifact_digest: 7204825a77b043f8acd29b3cd75a30138774434330c14676e367330ebb73a8ae
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-RECEIPTS-20260815-01
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: NODE_OPTIONS=--enable-source-maps node scripts/run-packed-e2e.mjs /tmp/kibi-e2e-packed-compiled /tmp/kibi-e2e-packed-compiled/fresh-verification-receipts.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 24b9085cc16fe3dc9c05054b96502f6622fef2ff5f242ffe69dee60c5f8847c7
    environment_hash: 934b23384d944f5b0bf0c8e10597c5bfc62fcc5a250775cdce150309d1cbba47
    started_at: '2026-08-15T12:41:06.000Z'
    finished_at: '2026-08-15T12:41:36.000Z'
    artifact_digest: 5e81d6366fe11dd787579d0e63fac306f529d59c4dc357164d9bcd299d4ed51f
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-RECEIPTS-20260815-02
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: NODE_OPTIONS=--enable-source-maps node scripts/run-packed-e2e.mjs /tmp/kibi-e2e-packed-compiled /tmp/kibi-e2e-packed-compiled/fresh-verification-receipts.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: b503bd366de55a4fb89b68e0cfdf3b74c9ea1331a5474e9c569978d28ce0b149
    environment_hash: 5007d53012af539504995c6ad9a5b23a232fe9bda9ed308269d8518c49fd63ba
    started_at: '2026-08-15T12:44:36.000Z'
    finished_at: '2026-08-15T12:44:36.000Z'
    artifact_digest: 036dfdea0d579a7cb0c4a570a54c84bcf5f31a7b7c62b4b7011188db908d03e2
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-RECEIPTS-20260815-03
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: NODE_OPTIONS=--enable-source-maps node scripts/run-packed-e2e.mjs /tmp/kibi-e2e-packed-compiled /tmp/kibi-e2e-packed-compiled/fresh-verification-receipts.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 7bc5e6f0b7faa554cddf9bbd4bb36f7af8e395ad2a567fa9f429d62e7d4947c0
    environment_hash: 56cf31308dfd4e2f56aefe3fd57d7a40e62b8d54cd45e2e338f746a6f5143220
    started_at: '2026-08-15T12:56:55.000Z'
    finished_at: '2026-08-15T12:56:55.000Z'
    artifact_digest: 47771f7ec19a76b9d3e85b94b072d0cda1c9e79d8e7473b3f4ded4a3600ffd67
id: TEST-kibi-fresh-verification-receipts
type: test
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-fresh-verification-receipts
  required_case_symbols:
    - SYM-test-packed-fresh-verification-receipts
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
---

Verifies receipt schema and history validation, append-only mutation and sync behavior, deterministic workspace snapshots, Prolog proof-state classification, durable-status non-authority, and CLI/MCP reporting parity.
