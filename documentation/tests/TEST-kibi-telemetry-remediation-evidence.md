---
id: TEST-kibi-telemetry-remediation-evidence
title: Packed correlated telemetry remediation tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/TEST-kibi-telemetry-remediation-evidence.md
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-TELEMETRY-REMEDIATION-20260810-01
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/telemetry-remediation-evidence.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: f55c21c124a7a4edf03452e3f42b7cdda0df544e245c95035bfb3c4bb4996714
    environment_hash: 0101ced91a67a9356cf6dfa763d82002b3f363120b391c64f87e988a48f56943
    started_at: '2026-08-10T21:20:29.042Z'
    finished_at: '2026-08-10T21:20:56.173Z'
    artifact_digest: e788852b35bc62d300088044ceb635d44f22d1a4f244652a2a655ab82c23b46a
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e8747f8893cd7d691d54bbdb
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 44c17edad52435b3de4fe626e5d73cd0cc61e76de39087a76efd653e8cc619d0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:16:44.925Z'
    finished_at: '2026-08-16T19:17:26.857Z'
    artifact_digest: 02b68ca001d0eb225143ce1d36e8ff8cbd559ebafc3ed50db564bb51b78c7bf3
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41932
tags:
  - telemetry
  - diagnostics
  - remediation
  - cli
  - mcp
  - packed
  - e2e
links:
  - type: validates
    target: SCEN-kibi-telemetry-remediation-evidence
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-telemetry-remediation-evidence
  required_case_symbols:
    - SYM-test-packed-telemetry-remediation
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
---

Exercises correlated diagnostic records and `kibi.telemetry-remediation.v1` through freshly packed CLI and MCP binaries. The test proves semantic logging parity, hard correlation when both session/actor identifiers are present, exact event references, deterministic repair order, explicit report-level evidence gaps, and read-only command behavior.
