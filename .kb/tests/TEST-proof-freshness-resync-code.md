---
title: The freshness resync step code shall be freshness_resync, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-freshness-resync-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-plan-freshness-resync
  proves:
    - CLAIM-C5952505804918D0
origin:
  kind: agent
  recorded_at: '2026-10-28T18:54:37.815Z'
id: TEST-proof-freshness-resync-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3346e2c4fb367167fd2823c4
    test_id: TEST-proof-freshness-resync-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 33e117f0bb38704527074a415382d2168f7f51dcc35b81f6046e46439b8e1b75
    binding_hash: 6f2845a2f902b3825ec861d9e5099bd48d973fe33ffe02c617b42b2070a6c24b
    fingerprint: 6ca12d50ceb83767fb2996052b1756ac98181b61473d7a51a3aa63635d4b8641
    fingerprint_components:
      contract: 33e117f0bb38704527074a415382d2168f7f51dcc35b81f6046e46439b8e1b75
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
      - symbol_id: SYM-proof-freshness-resync-code
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-freshness-resync-code
      pattern:
        symbol_id: SYM-migration-plan-freshness-resync
        type: string
        value: freshness_resync
    certificate_digest: 81730f32ed7dc74878a58aa8c8779fba86650e4c15e33768b58308f26c5e272e
    claim_bindings:
      - claim_key: CLAIM-C5952505804918D0
        requirement_id: REQ-agent-migration-plan-codes
        fact_id: FACT-freshness-resync-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: freshness_resync
---
Proves that the freshness resync step code shall be freshness_resync, against the code Kibi reads at ingest.