---
title: Retrieval replay harness tests
status: passing
priority: must
tags:
  - search
  - retrieval
  - evaluation
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-11-25T14:57:12.719Z'
id: TEST-retrieval-replay-harness
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-retrieval-replay-harness
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f7b3e5a9788169b040d63310
    test_id: TEST-retrieval-replay-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: d6ad7e4f5a7254bb5e880524219932425a024c56d24b56859ce7906093ea3cae
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T15:15:15.804Z'
    finished_at: '2026-11-25T15:15:17.628Z'
    artifact_digest: a1a78b44b32ea526cd600f4b5fb061656b1193666bae49b65a44f6197d724f84
    contract_hash: 1c098d8cde56919579edbc208674685b656595d3e2d21a2c7f18510984a3d60f
    binding_hash: 24f78f2bfbf74a94189c3f3115ccfa255ebca2c285ed5ca10bab77365da51e16
    fingerprint: d8123265975638e340d5e615bd8b5f478847f69ec8887de87ea236cedd188cec
    fingerprint_components:
      contract: 1c098d8cde56919579edbc208674685b656595d3e2d21a2c7f18510984a3d60f
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
      - symbol_id: SYM-test-retrieval-replay-harness
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs scripts/tests/retrieval-eval.test.ts: the store loader reads this repository's own .kb (decisions, links and bodies), every replay case set loads with its dev, holdout or report split and no question or synthetic edit is written for a decision a frozen benchmark arc probes, the metrics rank, summarize and format results, scaling clones only look-alikes from other knowledge sources, and today's search, today's edit hook and the decision-card retriever each answer a question about this repository end to end.

A false pass would be a case loader that reads an empty fixture, so every rate is computed over nothing.