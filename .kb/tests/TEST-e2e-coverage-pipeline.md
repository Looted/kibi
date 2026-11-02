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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-24f171824ed37f4e04835386
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: passed
    code_snapshot: b2edd87f9db88973f9e196f6a0d9024cced12f4a3af6a63e455f5afc217e383a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-31T18:26:56.488Z'
    finished_at: '2026-10-31T18:27:05.757Z'
    artifact_digest: 8a2311d8d83bb341840da2ee80ac9dff57e194611b479e877eef1d12f332ee58
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: 81ce3a5265fcfa6762dec9d79ddecf3c22dcaeeafb25fd67e979403444851c40
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
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
tags:
  - review:context-missing
---
