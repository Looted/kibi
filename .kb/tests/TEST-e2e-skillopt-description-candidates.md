---
title: A composed description candidate is frozen and is what the target reads, through the CLIs with a stub model
status: active
priority: should
tags:
  - skillopt
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-skillopt-description-candidates
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-skillopt-description-candidates
    target: default
    native_id: documentation/tests/e2e/skillopt-description-candidates.e2e.ts::skillopt description candidates e2e
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-06: let SkillOpt optimize the skill description, not just the body'
  recorded_at: '2026-10-06T00:22:45.349Z'
id: TEST-e2e-skillopt-description-candidates
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c489ff9f0fdb74c336e15847
    test_id: TEST-e2e-skillopt-description-candidates
    scope: end_to_end
    outcome: passed
    code_snapshot: b1ff3d03e4e4e49f12fd4f5dd047275d2d553ce0d9ff0826195cc2f4c366daaf
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-06T00:27:59.068Z'
    finished_at: '2026-10-06T00:28:07.584Z'
    artifact_digest: 0901d0060ba77d62ab883d828515ff278cdeb26e1601e268e7cace93e434b8c0
    contract_hash: b41d69f045955d0d65f08c3ae8244ad1d63b1d5de5678bfa602248b760e6466d
    binding_hash: c6d72a18ce154fed80563ec8d2b591b7b50bdd29447515fb99e82e5d9755431a
    fingerprint: 8236ca468c3c8cb41de2114de6528fcb1605b416eaa97c3ae6e9e2783592050a
    fingerprint_components:
      contract: b41d69f045955d0d65f08c3ae8244ad1d63b1d5de5678bfa602248b760e6466d
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: a1778b26901ffded24465f6f4ee4226184ccd275d17d733042fd2e99ff18eb8d
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-skillopt-description-candidates
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
