---
title: Proof receipt maintenance operations run end to end against a packed CLI
status: active
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-proof-maintenance-ops
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-proof-maintenance-ops
    target: default
    native_id: documentation/tests/e2e/packed/proof-maintenance-ops.test.ts::proof receipt maintenance operations
id: TEST-e2e-proof-maintenance-ops
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9f99232dd0763dc36a0dcc8d
    test_id: TEST-e2e-proof-maintenance-ops
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 8ecb8862ac3eaba2c7f243c0054a56bcd3aca6aac01412c866cf305548c197e7
    binding_hash: cbba5b210622ef7edc8d3988d743088d875ec1678c78bfecfb56ebe344952d3b
    fingerprint: 3f18e5b25f13814b178dd4b22d750cb2ebd0f43dd7181893405cd652cc7f5447
    fingerprint_components:
      contract: 8ecb8862ac3eaba2c7f243c0054a56bcd3aca6aac01412c866cf305548c197e7
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4e32d5743cbd1a31791822b29d9b10218695f9e450568aa7e86afb8588295582
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-proof-maintenance-ops
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
