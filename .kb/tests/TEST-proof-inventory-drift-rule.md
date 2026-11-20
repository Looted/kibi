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
    receipt_id: PR-c3a5c95ea68efb44cf5e8402
    test_id: TEST-proof-inventory-drift-rule
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 1b887ceb14a6045ff8b5c31d55475c52ae4b6440267c950a58239d2cdddea378
    binding_hash: 72a66b6b79cb404cfab22c967a25d62679514ba17d194d2ae7a42155194ea480
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