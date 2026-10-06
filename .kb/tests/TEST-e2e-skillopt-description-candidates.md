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
    receipt_id: PR-4844d7ff9b7eb4308b88e723
    test_id: TEST-e2e-skillopt-description-candidates
    scope: end_to_end
    outcome: passed
    code_snapshot: cfa1c85bdbcd2296a837cbbeb62545d2b331299b7c41afcb157c399104e5c44e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-06T00:23:42.550Z'
    finished_at: '2026-10-06T00:23:49.892Z'
    artifact_digest: 2f5231e52828bee3b8059fd64273c8606b048a30851c8af923bc990f65040eea
    contract_hash: b41d69f045955d0d65f08c3ae8244ad1d63b1d5de5678bfa602248b760e6466d
    binding_hash: da414d2e23407fda27754830ee9ec2c0a022f8566535181ab3008651c8ffe823
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
