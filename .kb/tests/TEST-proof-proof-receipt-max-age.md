---
title: The maximum proof receipt age shall be 604800 seconds, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-proof-receipt-max-age
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-proof-receipt-max-age-seconds
  proves:
    - CLAIM-B7AF26BF0F918815
origin:
  kind: agent
  recorded_at: '2026-10-28T10:12:20.489Z'
id: TEST-proof-proof-receipt-max-age
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-793b61bda82ec8070d58bf1e
    test_id: TEST-proof-proof-receipt-max-age
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: a366d0da4e92faf11d5023d954aff5bd81c6fbc80e1704c67b07f58bd11d1a00
    binding_hash: 1c22df6fd0b878fd06acccab0601f0b85c64c7f6ce8e65629c6aeff6d82673bd
    fingerprint: 11ceac338fae894356b29798d30f9de08934292ed67014ac3c0c122f95587c61
    fingerprint_components:
      contract: a366d0da4e92faf11d5023d954aff5bd81c6fbc80e1704c67b07f58bd11d1a00
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
      - symbol_id: SYM-proof-proof-receipt-max-age
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-proof-receipt-max-age
      variable: max_receipt_age_seconds
      value_type: int
      assumptions:
        - operator: eq
          value: 604800
      claim:
        operator: eq
        value: 604800
    certificate_digest: 239af94d7b92c11d81275d6752fefa46226fd0f25f4354c779817fb54aac9954
    claim_bindings:
      - claim_key: CLAIM-B7AF26BF0F918815
        requirement_id: REQ-kibi-proof-receipt-max-age
        fact_id: FACT-proof-receipt-max-age
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 604800
          value_type: int
          variable: max_receipt_age_seconds
---
Proves that the maximum proof receipt age shall be 604800 seconds, against the code Kibi reads at ingest.