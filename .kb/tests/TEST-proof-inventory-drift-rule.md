---
title: The staged inventory drift rule shall be semantic-inventory-drift, by a regex proof
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
    - symbol_id: SYM-proof-inventory-drift-rule
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-staged-inventory-drift-STAGED_INVENTORY_DRIFT_RULE
  proves:
    - CLAIM-6DAA24F8B83DBF44
origin:
  kind: agent
  recorded_at: '2026-10-28T19:05:42.837Z'
id: TEST-proof-inventory-drift-rule
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a1b567e2bfe3cfd9f7b70af5
    test_id: TEST-proof-inventory-drift-rule
    scope: unit
    outcome: passed
    code_snapshot: 0ef83d98ba69f02638b918a7fb2a5c8745d7e16e758282b2caacd90570abbaff
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:07:55.032Z'
    finished_at: '2026-10-28T19:07:55.214Z'
    artifact_digest: cf42edbea518580bad270ba087c78e9642d31c9972ae86f507058461467e1818
    contract_hash: 1b887ceb14a6045ff8b5c31d55475c52ae4b6440267c950a58239d2cdddea378
    binding_hash: 83bad141cf3c58fa7017cfc32fc2cf592ab5f97a737ba724f820f6ba9adb3d33
    fingerprint: 92b7de767d548e30b88425ec16af6d6224df5d3a88f102f01b09a89f72f44448
    fingerprint_components:
      contract: 1b887ceb14a6045ff8b5c31d55475c52ae4b6440267c950a58239d2cdddea378
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
      - symbol_id: SYM-proof-inventory-drift-rule
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
      test_id: TEST-proof-inventory-drift-rule
      pattern:
        symbol_id: SYM-staged-inventory-drift-STAGED_INVENTORY_DRIFT_RULE
        type: string
        value: semantic-inventory-drift
    certificate_digest: 71c4c40e6641f207e428e64b073f7d8d7fc8df8badcb348da504e2cd43317e44
    claim_bindings:
      - claim_key: CLAIM-6DAA24F8B83DBF44
        requirement_id: REQ-ingestion-inventory-settings
        fact_id: FACT-inventory-drift-rule
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: semantic-inventory-drift
---
Proves that the staged inventory drift rule shall be semantic-inventory-drift, against the code Kibi reads at ingest.