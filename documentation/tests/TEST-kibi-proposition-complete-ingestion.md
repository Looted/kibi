---
id: TEST-kibi-proposition-complete-ingestion
title: Proposition-complete ingestion boundary tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/e2e/packed/proposition-complete-ingestion.test.ts
tags:
  - requirements
  - semantic-inventory
  - cli
  - mcp
  - sync
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-PROPOSITION-20260810-01
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/proposition-complete-ingestion.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 3575856c125e0c295553661a049c7eafef56a740e5a03c667dbf6da4b5bea2d4
    environment_hash: 6e6bbcb607fdce2e1a5d110e1105c16eb85b14725f9323fa0fa5b372428db14e
    started_at: '2026-08-10T15:56:32.625Z'
    finished_at: '2026-08-10T15:56:59.485Z'
    artifact_digest: 605825cb536c48c4424e00af28978494cc02715fc49e1b0d21fedb11c8d5d0f8
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-PROPOSITION-20260810-02
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/proposition-complete-ingestion.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: ebcb72a6263ef4b2b7732572082d776c89b90085a1cf4c4ca440ba10fc30df11
    environment_hash: 6e6bbcb607fdce2e1a5d110e1105c16eb85b14725f9323fa0fa5b372428db14e
    started_at: '2026-08-10T16:11:44.369Z'
    finished_at: '2026-08-10T16:12:12.341Z'
    artifact_digest: cb2d2d75bf0245becede4de525667fa64ccad9fc0fa2641e518f431d90aa9a3d
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8fe74a21adaf0e9b88d1de2f
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 44c17edad52435b3de4fe626e5d73cd0cc61e76de39087a76efd653e8cc619d0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:14:45.080Z'
    finished_at: '2026-08-16T19:15:29.432Z'
    artifact_digest: 9759b78ff5e38abd4defaddedc30f731cbc3dec782d7d8cf83c72ec7394098c9
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44352
links:
  - type: validates
    target: SCEN-kibi-proposition-complete-ingestion
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-proposition-complete-ingestion
  required_case_symbols:
    - SYM-test-packed-proposition-ingestion
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
---

Exercises the packed CLI from an isolated consumer installation. The suite proves direct preflight rejection, post-baseline Markdown rejection for a new incomplete requirement, and successful ingestion of the same prose when it carries the exact advisor-compatible version, source hash, claim key, role, status, and UTF-8 span. Unit and parity suites additionally cover duplicate identities, explicit unresolved states, exact grounding claim keys, modeling-plan completeness, and schema preservation.
