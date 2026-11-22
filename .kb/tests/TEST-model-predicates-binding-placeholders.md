---
title: Predicate binding placeholder tests
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
    - symbol_id: SYM-test-model-predicates-binding-placeholders
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T08:34:19.967Z'
id: TEST-model-predicates-binding-placeholders
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2e77ce35626c5c8407dc7917
    test_id: TEST-model-predicates-binding-placeholders
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: ada9e82e170aee7094da671eb2ec87c6bb8aae16f697d680aaa00132cac018d1
    binding_hash: 5a6564b649ad02238517d7a9d697c827ec20a88c046f4830de26a394983e7552
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
    kind: e2e
    evidence_level: tested
---
Runs `packages/cli/tests/operations/predicate-binding-placeholders.test.ts`, which classifies bindings that repeat their own or another argument name, stop words, booleans and declared constants, runs predicate suggestion with schema-named and with claim-derived bindings, and checks the `bindingHints` shape and summary text.