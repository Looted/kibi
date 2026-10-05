---
id: TEST-kibi-proof-aware-quality-diagnostics
title: Proof-aware coverage-depth and receipt-gap diagnostic tests
status: passing
created_at: 2026-08-14T00:00:00.000Z
updated_at: 2026-08-14T00:00:00.000Z
source: packages/cli/tests/public/impact/coverage-depth-quality.test.ts
tags:
  - requirements
  - diagnostics
  - coverage
  - proof
  - receipts
  - cli
verification_scope: end_to_end
verification_perspective: internal
links:
  - type: validates
    target: SCEN-kibi-proof-aware-quality-diagnostics
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-kibi-proof-aware-quality-diagnostics
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3d39b30932510ea505734503
    test_id: TEST-kibi-proof-aware-quality-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 03b73d06f8bd257888cb482850f18a049a5a03327d78623999a65de32ee6b76e
    binding_hash: 523a0f4372acbd1a591aa816dd97b735a3c788c3f2d6045c9dc25fe7b9054bee
    fingerprint: 051d4b42fffaccbac6615e6451aac956cc126aaefbfc6d0bb20a24d746f8ac12
    fingerprint_components:
      contract: 03b73d06f8bd257888cb482850f18a049a5a03327d78623999a65de32ee6b76e
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
      - symbol_id: SYM-e2e-test-kibi-proof-aware-quality-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Validates suppression of stale weak-depth heuristics when current scenario-backed E2E proof passes, preservation of independent proof gaps, and bounded receipt-gap evidence with v2 remediation guidance.
