---
title: Predicate binding placeholder tests
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
    - symbol_id: SYM-test-model-predicates-binding-placeholders
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T08:34:19.967Z'
id: TEST-model-predicates-binding-placeholders
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3011f01893d81509d8128a2a
    test_id: TEST-model-predicates-binding-placeholders
    scope: end_to_end
    outcome: passed
    code_snapshot: 958d97d1ca714d740f6d17315006a0e8f256102a370d9ee44f2b88223fb57c12
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-08T09:33:51.748Z'
    finished_at: '2026-10-08T09:33:51.872Z'
    artifact_digest: ec46e984a46e8bb91d2b997f72da628591a832e9441fcfb41fed537a1d29804e
    contract_hash: ada9e82e170aee7094da671eb2ec87c6bb8aae16f697d680aaa00132cac018d1
    binding_hash: deea96438869812367d02cfdc40184600fbd4eba9383847b3db5f8b05edc8357
    fingerprint: f19766aa9ddd6d2110360d60d676853d4430b0cb5a8766138f25dea16f4c13ce
    fingerprint_components:
      contract: ada9e82e170aee7094da671eb2ec87c6bb8aae16f697d680aaa00132cac018d1
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
      - symbol_id: SYM-test-model-predicates-binding-placeholders
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs `packages/cli/tests/operations/predicate-binding-placeholders.test.ts`, which classifies bindings that repeat their own or another argument name, stop words, booleans and declared constants, runs predicate suggestion with schema-named and with claim-derived bindings, and checks the `bindingHints` shape and summary text.