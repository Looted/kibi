---
title: Code proof kinds through kibi prove with the packed CLI
status: passing
tags:
  - proof
  - certificate
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-code-proof-kinds
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-24T19:31:48.432Z'
id: TEST-kibi-code-proof-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ee75371cdfdce725b367d995
    test_id: TEST-kibi-code-proof-kinds
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 29c34ad0fad2e9ad33ebe8b28dbeddfcfbebeb6cf8928dc41def71e59dcd3ef1
    binding_hash: 38b208d5bd2dbc4e72efd4d9af1131aea34e7cb7d92352fba45bfc3be3198da0
    fingerprint: 7064726709799c58bb00b06cc79335e53a22cb3e79d6c0c4bcb4aa1219a9192d
    fingerprint_components:
      contract: 29c34ad0fad2e9ad33ebe8b28dbeddfcfbebeb6cf8928dc41def71e59dcd3ef1
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
      - symbol_id: SYM-e2e-packed-code-proof-kinds
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the installed packed CLI on a sandbox repository whose command integration leaves exhaustive, typecheck, arithmetic and SMT certificates, runs kibi prove --all, and checks every test's latest receipt: re-checked certificates earn kibi.proof-receipt.v2 at evidence level proved, while a hand-listed domain, an arithmetic claim its assumptions do not entail and an e2e test stay at tested with the reason.