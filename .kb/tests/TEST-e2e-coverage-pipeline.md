---
title: CI coverage pipeline runs end to end over real Bun coverage
status: active
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-coverage-pipeline
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-coverage-pipeline
    target: default
    native_id: documentation/tests/e2e/coverage-pipeline.e2e.ts::coverage pipeline e2e
id: TEST-e2e-coverage-pipeline
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d6d459a95aeb098f5f4f3033
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: 98d0d1c68285af5c8b51f922a3f65194095544a6100d5bdf0392aad0fc9b99cb
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
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
