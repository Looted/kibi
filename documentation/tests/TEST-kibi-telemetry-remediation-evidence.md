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
