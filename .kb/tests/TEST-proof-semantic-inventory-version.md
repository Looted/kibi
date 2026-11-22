---
title: The semantic inventory version shall be kibi.semantic-inventory.v1, by a regex proof
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
    - symbol_id: SYM-proof-semantic-inventory-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-semantic-inventory-version
  proves:
    - CLAIM-FDC0710E0F577270
origin:
  kind: agent
  recorded_at: '2026-10-28T19:05:23.527Z'
id: TEST-proof-semantic-inventory-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-dd54d84d6a9a7ba08cf9fa2c
    test_id: TEST-proof-semantic-inventory-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 5f383a1b88a6e77651aabed28f7393897a57fa3228135080dbec2c5779ab0962
    binding_hash: 631fa3056ee754d9134a33c28caa124042b086b8160f4078af53a0ebf92296c0
    fingerprint: bc54216b8231ca30eb227429470c72e86ebd1da7d0e854b974b7541d0d2bb52f
    fingerprint_components:
      contract: 5f383a1b88a6e77651aabed28f7393897a57fa3228135080dbec2c5779ab0962
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
      - symbol_id: SYM-proof-semantic-inventory-version
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
      test_id: TEST-proof-semantic-inventory-version
      pattern:
        symbol_id: SYM-semantic-inventory-version
        type: string
        value: kibi.semantic-inventory.v1
    certificate_digest: 1ffb5a8d64313580ff07b3d658efe93113ad387efb21264cb722de54cfb8249c
    claim_bindings:
      - claim_key: CLAIM-FDC0710E0F577270
        requirement_id: REQ-ingestion-inventory-settings
        fact_id: FACT-semantic-inventory-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.semantic-inventory.v1
---
Proves that the semantic inventory version shall be kibi.semantic-inventory.v1, against the code Kibi reads at ingest.