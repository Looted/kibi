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
    receipt_id: PR-a877828ae40a8b0a1a242718
    test_id: TEST-proof-semantic-inventory-version
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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