---
id: TEST-root-suite-batch-diagnostics
title: Batch timeout and failure diagnostics in root test suite
status: passing
created_at: 2026-07-27T10:00:00.000Z
updated_at: 2026-07-27T10:00:00.000Z
priority: must
tags:
  - testing
  - diagnostics
  - root-suite
  - unit
links:
  - type: validates
    target: REQ-root-suite-batch-diagnostics
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-982eea84322c894bd9808222
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: e418bee882c81019aff770beeb5e3ee66ac11494fa3fce63b7ba9f9d585fad18
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Exercises the batch diagnostic helpers in `test/root.test.ts`:
`getBatchFailureMessage` returns `null` for clean batches and a
descriptive string for timeouts, non-zero exits, and summary-count
mismatches. `parseSuiteSummaries` extracts bun pass/fail/file counts
from combined stdout+stderr output across multiple batch runs.
