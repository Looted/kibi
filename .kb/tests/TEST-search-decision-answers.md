---
title: Decision search answers tests
status: passing
priority: must
tags:
  - search
  - retrieval
  - cli
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-11-25T19:26:31.863Z'
id: TEST-search-decision-answers
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-search-decision-answers
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3c702dcc75e4f5719a58c420
    test_id: TEST-search-decision-answers
    scope: end_to_end
    outcome: passed
    code_snapshot: 4b66676736e4ffd3d568ebd40c071d55c0a0c605ee2bb57b0941bd7a509e70d6
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T19:49:35.551Z'
    finished_at: '2026-11-25T19:50:28.875Z'
    artifact_digest: 4385d3b873dc5e5fa37118b6ec3f1ceb9bd6dc73debcac5e51ef83c597eddc10
    contract_hash: f56e1317d792f9ff46697b3cc56e44fbd9c61a0d2757ee904fd5d11857e82f67
    binding_hash: 62c2cf8e0f05588b0a460f8a48729027b07e1a11d93a2a72a5bfb8e58da71279
    fingerprint: 8b9a344326edcf66c32c64638a366276994d7b802dd94037f5b3373e772fadc3
    fingerprint_components:
      contract: f56e1317d792f9ff46697b3cc56e44fbd9c61a0d2757ee904fd5d11857e82f67
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
      - symbol_id: SYM-test-search-decision-answers
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs packages/cli/tests/decision-corpus.test.ts (the corpus read from the authored .kb files: entities, bodies, links, relationship shards and symbols, the per-file cache and unreadable files), packages/cli/tests/decision-search.test.ts (decision cards from the question's words, the fused meaning ranking and the meaning list, folded decisions seeding the answer, the recorded limits, type filters, paging and weak questions), packages/cli/tests/public-mutation/operations/discovery-search.mutation.test.ts (kb_search over decisions and typed rows: the card rows, the answer layer from covering cards only, the weak note and next steps, the meaning analysis and an unavailable provider) and, through the built CLI, packages/cli/tests/consumer/search-answer-layer.test.ts and packages/cli/tests/consumer/search-closed-requirements.test.ts.

A false pass would be a fixture whose every question is covered by its first card, so a weak answer and its uncovered words are never exercised.