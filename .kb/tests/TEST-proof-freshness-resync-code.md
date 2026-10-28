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
    receipt_id: PR-65d8f3fbb4d603b6cc6e29a8
    test_id: TEST-proof-freshness-resync-code
    scope: unit
    outcome: passed
    code_snapshot: 9d5c809154467be6acfd269eb08afb5aca0715b26530e00d26a714dc949a439f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T18:56:25.311Z'
    finished_at: '2026-10-28T18:56:25.462Z'
    artifact_digest: 652890499485272761d4189ca9af0bb7c55704d7c6cd95bc0d089a543c082f85
    contract_hash: 33e117f0bb38704527074a415382d2168f7f51dcc35b81f6046e46439b8e1b75
    binding_hash: 8333146029f82309a86d3c624038abe246d240f156469f6dacbbdc3b267f726b
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