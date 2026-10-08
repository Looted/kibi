---
title: Predicate binding clause tests
status: active
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-80bab59fa9ddec78d15fdb59
    test_id: TEST-model-predicates-binding-clauses
    scope: end_to_end
    outcome: passed
    code_snapshot: 3464ae42f083c2b6e9ed9b482fa7e54f58e94f0d5628e4ace6c2f8d99ecacd37
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-08T21:31:14.248Z'
    finished_at: '2026-10-08T21:31:14.419Z'
    artifact_digest: fd2028e00742c610c3d03ae0d2cea71bbd4900e5d5ae1d8c9d293dbf67526df3
    contract_hash: 6b930095c673fe8204f6234877bfd53b294df1b23434b8f513c2b314adf6a64c
    binding_hash: 89aa3813754a29aabedebdef21bd506b9dbacea268686cd1ec761ac759b275ed
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
---
Runs the predicate binding placeholder suite, which models a claim whose actor is a seven-word clause and checks that the actor stays unbound with a hint, that a short noun still binds, and that explicit bindings and non-participant arguments are not judged by length.