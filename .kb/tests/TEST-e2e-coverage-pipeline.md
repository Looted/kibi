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
    receipt_id: PR-6cd9789d6d54bb51dfac88bd
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: passed
    code_snapshot: 287d8b7e21fc5ebfe33742e839feb2dd6ab1c5b91349284c293a90ceeeb17a0c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T10:17:34.797Z'
    finished_at: '2026-10-27T10:17:47.873Z'
    artifact_digest: 4a6c200bd5a0ba550677033b5b0012eeb9e06266bd28fb75d6b1d468c4a61e12
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: b226988d52ba5434cb9e765807ff7829af57d88c008329bd73563541aa3f3795
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
