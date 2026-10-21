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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-52239789b6618a693c6f4abd
    test_id: TEST-kibi-check-proof-evidence-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 502e7f169b9bb45c13f10a0dc9585971f9efa4956e3fc449f0cd25ee14a876b4
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-21T13:02:06.559Z'
    finished_at: '2026-10-21T13:02:11.365Z'
    artifact_digest: 4e5b2026b5bacc50993fb664c48ff8db5ae2d9579f399161ee11fed76e233a78
    contract_hash: 29b14547910cae3a8d6a3b2bae1423f510045c2bd20a4685fecb80d1f041f168
    binding_hash: 0fdd1b47c62b5260fa42126b2b26682889ad3650f0f6a1e06362fc33c67bdaa5
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
---

Drives `kibi check`, `kibi prove` and `kibi coverage` through the built `kibi` binary against a fixture requirement whose only scenario test is still `status: active` (`packages/cli/tests/consumer/check-proof-evidence.test.ts`).

- Before any receipt, `kibi check` lists `coverage_depth_review` for the requirement and its evidence carries the proof status `kibi coverage` reports.
- After `kibi prove` records a current passing end-to-end receipt, coverage reports the passing-e2e stage as passed and `kibi check` no longer lists `coverage_depth_review` for the requirement.
