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
    receipt_id: PR-642de69b41fcb6ec790d8343
    test_id: TEST-proof-receipt-versions
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 55b0514578f8aebfce98b310a9350611a91c2f53f48a0deb1d6be04800cea10f
    binding_hash: 48dadc75b6c6baabc8f1f8f4072b341477ad9bfc9adf52111b5f19cdb74b7dd7
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