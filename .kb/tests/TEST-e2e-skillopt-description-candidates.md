---
title: A composed description candidate is frozen and is what the target reads, through the CLIs with a stub model
status: passing
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
  ref: 'Maintainer request, 2026-10-06: let SkillOpt optimize the skill description, not just the body Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 6): "Ok"'
  recorded_at: '2026-10-06T00:22:45.349Z'
id: TEST-e2e-skillopt-description-candidates
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2852c4135573bf7e9054b013
    test_id: TEST-e2e-skillopt-description-candidates
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: b41d69f045955d0d65f08c3ae8244ad1d63b1d5de5678bfa602248b760e6466d
    binding_hash: c50e5001f279e6a4ae299fd04526403aaaf0e7a038dd64032989e4d7fd75d1b5
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
    kind: e2e
    evidence_level: tested
---

## Context
Agents decide whether to load a skill from its description, so a candidate may replace the description too. This proves that compose freezes it and the target reads exactly that text. Source: commit "prove description candidates end to end".
