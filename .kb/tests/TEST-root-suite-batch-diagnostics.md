---
id: TEST-root-suite-batch-diagnostics
title: Batch timeout and failure diagnostics in root test suite
status: active
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
    receipt_id: PR-59b12a32b4daa26c2b93621b
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 70f6bb67c0940f6169d76de43916909d73eeacc4fe74d8b3f03440eb4212d837
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-26T20:48:16.110Z'
    finished_at: '2026-10-26T20:48:16.286Z'
    artifact_digest: ce94310d775b9ed29bf99483289f4bbd04effc0f9e14ffc67772f58dc960d70e
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: a83b4095a9df780c53ba1524f5bb4c5f5ef5347890e252d4d51a4defee0170c1
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
