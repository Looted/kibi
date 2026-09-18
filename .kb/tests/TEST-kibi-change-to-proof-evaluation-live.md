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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-94839735728f1ed7bda40320
    test_id: TEST-kibi-change-to-proof-evaluation-live
    scope: end_to_end
    outcome: passed
    code_snapshot: 108fe624639c2c7c00ac5f051d948270f8c18926753c35581e701c3ae1bfc1aa
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T10:04:24.719Z'
    finished_at: '2026-09-18T10:37:16.478Z'
    artifact_digest: b15a7bc4b29c307248e8600846fa2a23b322db1a4047fbb1600a7cbceae82595
    contract_hash: ff0dfdd4fc0b0ec45da770e68b5fba805a03baefd7b07514c6ecf177b33b3f89
    binding_hash: 54fbca7f46be3e4fd7e31a3bb3aa5bd364a04916867b21210133b54b37b8bc89
    fingerprint: 0b578530c3180ec3495da7bf2da3a3cfea91abb73941ef31b322a4849662e41f
    fingerprint_components:
      contract: ff0dfdd4fc0b0ec45da770e68b5fba805a03baefd7b07514c6ecf177b33b3f89
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
      - symbol_id: SYM-quality-eval-main
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b332d57994cab4d092220e49
    test_id: TEST-kibi-change-to-proof-evaluation-live
    scope: end_to_end
    outcome: passed
    code_snapshot: 8465c8db1c316b64cda7e0e5e8183795129f74cfda3fa1592a16e0e62df2d15b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T12:54:02.548Z'
    finished_at: '2026-09-18T13:26:16.375Z'
    artifact_digest: c856fd3f8a3a374f12bc697a485639499db3fe7263e1bc824f3939e0d3be4d40
    contract_hash: 2a9bfe59b870b62ebf6d959c8c73966b5cfa2301e93494b0a36f736272247960
    binding_hash: bbda25742820f26a5c1b1a7a3b90c0b8f260a3227a1d69963fe051e67472f4f0
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
---

Runs the change-to-proof evaluator entry point live against the public held-out gold corpus and asserts the deterministic metric contract.
