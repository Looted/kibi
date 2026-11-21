---
id: TEST-kibi-check-proof-evidence-cli
title: Consumer CLI check drops coverage_depth_review once kibi prove records a passing e2e receipt
status: passing
priority: must
created_at: 2026-10-21T12:59:56.000Z
updated_at: 2026-10-21T12:59:56.000Z
tags:
  - proof
  - receipts
  - diagnostics
  - coverage
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
links:
  - type: validates
    target: SCEN-kibi-proof-aware-quality-diagnostics
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-check-proof-evidence-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-check-proof-evidence-cli
    target: default
    native_id: packages/cli/tests/consumer/check-proof-evidence.test.ts::kibi check proof evidence through the kibi CLI::a current passing e2e receipt clears coverage_depth_review in kibi check
    source_file: packages/cli/tests/consumer/check-proof-evidence.test.ts
    line: 132
origin:
  kind: agent
  recorded_at: '2026-10-21T12:59:56.000Z'
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3620b9b2b4cb076ea48d1113
    test_id: TEST-kibi-check-proof-evidence-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 29b14547910cae3a8d6a3b2bae1423f510045c2bd20a4685fecb80d1f041f168
    binding_hash: 6148635e61b7195df03d21a0222729e70bdf484a15a7c347026d6be1e37433a9
    fingerprint: bc87bd142060642b5e8b9b96eedccabcd858017ec4b61c4e7b312ee8462f5848
    fingerprint_components:
      contract: 29b14547910cae3a8d6a3b2bae1423f510045c2bd20a4685fecb80d1f041f168
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 2b8a4fa3e01ac2430fc669e958e8bd451d504f46c0c48e67d5162440f4a0fe8b
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-check-proof-evidence-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---

Drives `kibi check`, `kibi prove` and `kibi coverage` through the built `kibi` binary against a fixture requirement whose only scenario test is still `status: active` (`packages/cli/tests/consumer/check-proof-evidence.test.ts`).

- Before any receipt, `kibi check` lists `coverage_depth_review` for the requirement and its evidence carries the proof status `kibi coverage` reports.
- After `kibi prove` records a current passing end-to-end receipt, coverage reports the passing-e2e stage as passed and `kibi check` no longer lists `coverage_depth_review` for the requirement.
