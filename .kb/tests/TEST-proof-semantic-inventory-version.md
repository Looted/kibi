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
    receipt_id: PR-e98287a9f7bb3c579e85f42d
    test_id: TEST-proof-semantic-inventory-version
    scope: unit
    outcome: passed
    code_snapshot: 0ef83d98ba69f02638b918a7fb2a5c8745d7e16e758282b2caacd90570abbaff
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:07:48.977Z'
    finished_at: '2026-10-28T19:07:49.138Z'
    artifact_digest: e375cdaf5ddb7befc114eb270bb586d950a8bebcaa365fe9d7eb0be7d4571701
    contract_hash: 5f383a1b88a6e77651aabed28f7393897a57fa3228135080dbec2c5779ab0962
    binding_hash: 457f48241a0bb749e93cbe1542ba5c56a2c2c07cb128848f69fec83f38be620d
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