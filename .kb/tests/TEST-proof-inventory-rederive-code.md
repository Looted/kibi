---
title: The semantic inventory rederive code shall be semantic_inventory_rederive, by a regex proof
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
    - symbol_id: SYM-proof-inventory-rederive-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-semantic-inventory-rederive-code
  proves:
    - CLAIM-AF9DC248F0FF1582
origin:
  kind: agent
  recorded_at: '2026-10-28T18:50:28.444Z'
id: TEST-proof-inventory-rederive-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a6073a50321a116c780e9157
    test_id: TEST-proof-inventory-rederive-code
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 30d295c74157546b8f1a3cfcb5eb53c3d92c03368cd9471bcc683bbd750c9448
    binding_hash: 27bdd915e882cb32afa5bc7235c77b70ac1edcd9965d37ea512ad68cd0e13849
    fingerprint: bb0e3a5dae0daf7f44748f3b057702470d2318f0e4db6cf3f17987ec04f52fc0
    fingerprint_components:
      contract: 30d295c74157546b8f1a3cfcb5eb53c3d92c03368cd9471bcc683bbd750c9448
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
      - symbol_id: SYM-proof-inventory-rederive-code
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
      test_id: TEST-proof-inventory-rederive-code
      pattern:
        symbol_id: SYM-migration-semantic-inventory-rederive-code
        type: string
        value: semantic_inventory_rederive
    certificate_digest: 0f729a322ef27cc80d3f44113c6122d9b96d14892cf9633b6801c6d6e03e7331
    claim_bindings:
      - claim_key: CLAIM-AF9DC248F0FF1582
        requirement_id: REQ-cli-schema-migration-codes
        fact_id: FACT-inventory-rederive-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: semantic_inventory_rederive
---
Proves that the semantic inventory rederive code shall be semantic_inventory_rederive, against the code Kibi reads at ingest.