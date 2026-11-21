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
    receipt_id: PR-6030397d54fef609581feff4
    test_id: TEST-model-predicates-binding-clauses
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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