---
id: TEST-kibi-telemetry-acceptance-gate
title: Packed telemetry acceptance gate tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/TEST-kibi-telemetry-acceptance-gate.md
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-TELEMETRY-20260810-01
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/telemetry-acceptance-gate.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: af5a3d13df853075bfbcf1e13ce7c5765c54d6d15b23b0fbc20298ef593e8d00
    environment_hash: f4b357a726bb3da5c6af799453c3e30cecfa943779c803b59039dcfdb73a58b2
    started_at: '2026-08-10T19:09:20.218Z'
    finished_at: '2026-08-10T19:09:49.114Z'
    artifact_digest: 39945477ebe4020860aa85dd10345dfc3a335f82858df105730d1c4194a532b0
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-TELEMETRY-20260810-02
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/telemetry-acceptance-gate.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 618ad77e50f1f13da37d16e0b560b816f86e80ce1234a40e286f1d5dea43c6a5
    environment_hash: f4b357a726bb3da5c6af799453c3e30cecfa943779c803b59039dcfdb73a58b2
    started_at: '2026-08-10T19:41:00.083Z'
    finished_at: '2026-08-10T19:41:26.525Z'
    artifact_digest: 979bd481af2f083679b36fc2eaa7272fd49c7f95358a9d58dc692c6910b30fe7
  - version: kibi.verification-receipt.v2
    receipt_id: VR-658dc85746339052be727ecb
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-acceptance-gate
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-acceptance-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: 44c17edad52435b3de4fe626e5d73cd0cc61e76de39087a76efd653e8cc619d0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:15:46.516Z'
    finished_at: '2026-08-16T19:16:28.683Z'
    artifact_digest: d9e1870c1476ad3e27ba1891c7d6cf93a3e5accf5d6a1e1c7895c57e8b2e279a
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42167
tags:
  - telemetry
  - acceptance
  - diagnostics
  - packed
  - e2e
links:
  - type: validates
    target: SCEN-kibi-telemetry-acceptance-gate
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-telemetry-acceptance-gate
  required_case_symbols:
    - SYM-test-packed-telemetry-acceptance
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
---

Exercises `kibi.telemetry-acceptance.v1` through a fresh packed CLI installation, including successful enforcement, fail-closed exit behavior, canonical preflight correlation, repeated failure detection, and unfiltered quality-diagnostic presentation.
