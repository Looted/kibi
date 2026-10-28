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
    receipt_id: PR-bbc68346f083cc641b6455de
    test_id: TEST-proof-inventory-rederive-code
    scope: unit
    outcome: passed
    code_snapshot: dc0be4d5803f22ca38ce1004b6769d2368029ae49edea82620e6c6618cbf4d3a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T18:53:00.768Z'
    finished_at: '2026-10-28T18:53:00.944Z'
    artifact_digest: d77586d8266a5cd43750324d41ac624bcc1e2951f529d30c45e3fe8ac3609391
    contract_hash: 30d295c74157546b8f1a3cfcb5eb53c3d92c03368cd9471bcc683bbd750c9448
    binding_hash: dc082653d7ef5ad83ff265188c28a893b7bc3003ee17afcbe9eec024cd5b374b
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