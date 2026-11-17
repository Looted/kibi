---
title: Staged gate scratch store tests
status: passing
priority: must
verification_scope: end_to_end
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T19:30:00.000Z'
id: TEST-staged-gate-scratch-store
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-staged-gate-scratch-store
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-343b6a3e9beea4726638b5df
    test_id: TEST-staged-gate-scratch-store
    scope: end_to_end
    outcome: passed
    code_snapshot: df84fc91d0f807889519f20a576fcd787807fc96a14d6cb59f83a53eb62a9ce7
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-17T07:52:14.949Z'
    finished_at: '2026-11-17T07:52:36.667Z'
    artifact_digest: 2924430a7ff78179206ffe0799d998d67ea830eabef866b69cd5f9f63365dc5d
    contract_hash: e006222ed4a7d9ff00b7ff57c1ab1bf719955547d841c769002068e14682aa77
    binding_hash: 4eef904b33072c1b1cb445abd0e402fe96e2dcb50e067e2b123c01c5e7f33bd3
    fingerprint: bf9093a5a1a5a2f6009d68b6189d7cc9349f315dc1408061bb4581fcc40aad08
    fingerprint_components:
      contract: e006222ed4a7d9ff00b7ff57c1ab1bf719955547d841c769002068e14682aa77
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
      - symbol_id: SYM-test-staged-gate-scratch-store
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks that the staged gate's temporary store does not save after each write batch, that the evidence floor can be asked for named requirements only, and that the engine's scoped evidence floor evaluates only those requirements.