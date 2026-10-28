---
title: A readable proof receipt version shall be kibi.proof-receipt.v1 or kibi.proof-receipt.v2, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-receipt-versions
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-proof-receipt-versions
  proves:
    - CLAIM-9B1355E63FA003A4
origin:
  kind: agent
  recorded_at: '2026-10-28T20:41:47.515Z'
id: TEST-proof-receipt-versions
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-670601c6dfbcc555d5b020f2
    test_id: TEST-proof-receipt-versions
    scope: unit
    outcome: passed
    code_snapshot: 92602f270b7e88628c8037c45b6dfb5e60e0a0c0cc654a810f9bc19c706cde7c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T21:22:22.375Z'
    finished_at: '2026-10-28T21:22:22.566Z'
    artifact_digest: d9f789bf45bb091a6d24e51390b18af6e48915a369b9da036752fb1374c3c3d5
    contract_hash: 55b0514578f8aebfce98b310a9350611a91c2f53f48a0deb1d6be04800cea10f
    binding_hash: 2e5771d6a0157cc913b93e7a0eedc2205853174c0f0cf22ae05ad73b02358492
    fingerprint: 3cac7627776bee1bca29209166d649a96e13caa32d31a9bb1f2eb6a5a31ad5b1
    fingerprint_components:
      contract: 55b0514578f8aebfce98b310a9350611a91c2f53f48a0deb1d6be04800cea10f
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
      - symbol_id: SYM-proof-receipt-versions
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-receipt-versions
      domain:
        symbol_id: SYM-const-proof-receipt-versions
        members:
          - kibi.proof-receipt.v1
          - kibi.proof-receipt.v2
      results:
        - member: kibi.proof-receipt.v1
          outcome: passed
        - member: kibi.proof-receipt.v2
          outcome: passed
    certificate_digest: bf714b80bbbec189f25ea1b3364313bd9a3573b6439d80fbd24176af0115ee99
    claim_bindings:
      - claim_key: CLAIM-9B1355E63FA003A4
        requirement_id: REQ-kibi-proof-receipt-format
        fact_id: FACT-receipt-versions
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - kibi.proof-receipt.v1
            - kibi.proof-receipt.v2
---
Proves that a readable proof receipt version shall be kibi.proof-receipt.v1 or kibi.proof-receipt.v2, against the code Kibi reads at ingest.