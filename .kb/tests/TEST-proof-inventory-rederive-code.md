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
    receipt_id: PR-a48c85a9ad1da3fe694502de
    test_id: TEST-proof-inventory-rederive-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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