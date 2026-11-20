---
title: Live held-out change-to-proof evaluation on the gold corpus
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-change-to-proof-eval-live
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-change-to-proof-evaluation-live
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-90db830638be8b29439bc1e8
    test_id: TEST-kibi-change-to-proof-evaluation-live
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 2a9bfe59b870b62ebf6d959c8c73966b5cfa2301e93494b0a36f736272247960
    binding_hash: f90e6301061ee3c43914901341c972b4c4c07367bc65f62f17823f1641c19241
    fingerprint: 259d022c2078d8e7a28ff3fa4ad146bf1c25a256b1282d985b76fd15aecb220b
    fingerprint_components:
      contract: 2a9bfe59b870b62ebf6d959c8c73966b5cfa2301e93494b0a36f736272247960
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
      - symbol_id: SYM-e2e-test-change-to-proof-eval-live
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Runs the change-to-proof evaluator entry point live against the public held-out gold corpus and asserts the deterministic metric contract.
