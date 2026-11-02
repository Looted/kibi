---
title: The search hints embedding model shall be minishlab/potion-base-8M, by a regex proof
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
    - symbol_id: SYM-proof-search-hints-model-id
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  proves:
    - CLAIM-1F6530C9D5F1B2F4
  pattern_source:
    symbol_id: SYM-const-search-hints-model-id
origin:
  kind: agent
  recorded_at: '2026-10-30T19:40:19.833Z'
id: TEST-proof-search-hints-model-id
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-14e8a9e78ffc9abc4a9586d5
    test_id: TEST-proof-search-hints-model-id
    scope: unit
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:45:31.559Z'
    finished_at: '2026-10-30T19:45:31.697Z'
    artifact_digest: 2851fd7d943e3353160992347f465034423460db673d6c0afd067b03f298eb13
    contract_hash: 045629ba13f11e322c6678e5d99a2f655255dfba8f5b6429c1e7b2ceb165cd4e
    binding_hash: afaa121183167579e13a3266cd686529acbbbf9a6003c2388df33d90c8b2e4fc
    fingerprint: a26e13757e130a54382df97b2b7b26e92fa3c1c188e3c8aafa498104519fc051
    fingerprint_components:
      contract: 045629ba13f11e322c6678e5d99a2f655255dfba8f5b6429c1e7b2ceb165cd4e
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
      - symbol_id: SYM-proof-search-hints-model-id
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
      test_id: TEST-proof-search-hints-model-id
      pattern:
        symbol_id: SYM-const-search-hints-model-id
        type: string
        value: minishlab/potion-base-8M
    certificate_digest: a8415f1e3de1110559b7c6d65f94f1e37b8755f19c33cbb4c69550f0820d4bc9
    claim_bindings:
      - claim_key: CLAIM-1F6530C9D5F1B2F4
        requirement_id: REQ-search-hints-model-pin
        fact_id: FACT-search-hints-model-id
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: minishlab/potion-base-8M
---
Proves that the search hints embedding model shall be minishlab/potion-base-8M, against the code Kibi reads at ingest.