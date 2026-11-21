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
    receipt_id: PR-9770188784bd728854a8c4b6
    test_id: TEST-proof-receipt-versions
    scope: unit
    outcome: passed
    code_snapshot: 7419ad5232bdbe1da8fca26f74b4b9ead24f00ba6d0d7de0f96f555646c2e065
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T21:09:11.644Z'
    finished_at: '2026-11-20T21:19:43.232Z'
    artifact_digest: 7139602fb04835015fd589e7172c5d2d08aef422be8d030f6da4a15ac11ca687
    contract_hash: 55b0514578f8aebfce98b310a9350611a91c2f53f48a0deb1d6be04800cea10f
    binding_hash: cac72402a4d7310b4696accce223250366d2f9d22e676e533892900c743736eb
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