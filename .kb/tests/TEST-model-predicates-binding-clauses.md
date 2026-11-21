---
title: Predicate binding clause tests
status: passing
priority: must
tags:
  - modeling
  - predicates
  - bindings
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-model-predicates-binding-clauses
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T21:05:39.845Z'
id: TEST-model-predicates-binding-clauses
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f2f9a60a9245110bda41008a
    test_id: TEST-model-predicates-binding-clauses
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 6b930095c673fe8204f6234877bfd53b294df1b23434b8f513c2b314adf6a64c
    binding_hash: bb1139af56dc32f6266dc7616803e8fb01f61ff120be765cef0901370fc32c61
    fingerprint: a9ee6a6d7d805201152e6c7cc125e7539f3ad3719b47c79697ea4d6cf0bc5fe1
    fingerprint_components:
      contract: 6b930095c673fe8204f6234877bfd53b294df1b23434b8f513c2b314adf6a64c
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
      - symbol_id: SYM-test-model-predicates-binding-clauses
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the predicate binding placeholder suite, which models a claim whose actor is a seven-word clause and checks that the actor stays unbound with a hint, that a short noun still binds, and that explicit bindings and non-participant arguments are not judged by length.