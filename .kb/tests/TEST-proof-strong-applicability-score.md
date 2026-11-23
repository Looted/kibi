---
title: A strong predicate applicability score shall be 0.8, by an arithmetic proof
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
    - symbol_id: SYM-proof-strong-applicability-score
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: 4fad501950207b0b
  proves:
    - CLAIM-C090BF6B4262783E
origin:
  kind: agent
  recorded_at: '2026-10-28T19:17:28.175Z'
id: TEST-proof-strong-applicability-score
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-68b0368bd20224a7b4ec0885
    test_id: TEST-proof-strong-applicability-score
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 6def47eb1ce1a6a47e66ac78ff18831b15856b3b9c39bf04e51203555fbe0c17
    binding_hash: 44ab4c3e130dfb8f46778bd4893af4f5f1225d26343599717137e2b8b9d82dc6
    fingerprint: f6e343875e62327f84fddb99b555b0af47ea3ce7beb4fcb6d145f8703fe8ff81
    fingerprint_components:
      contract: 6def47eb1ce1a6a47e66ac78ff18831b15856b3b9c39bf04e51203555fbe0c17
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
      - symbol_id: SYM-proof-strong-applicability-score
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
      test_id: TEST-proof-strong-applicability-score
      variable: strong_score
      value_type: real
      assumptions:
        - operator: eq
          value: 0.8
      claim:
        operator: eq
        value: 0.8
    certificate_digest: d6db2246a4ef4d9da7ab739a868676bdb96738c90704c53adb8d42176d2eca63
    claim_bindings:
      - claim_key: CLAIM-C090BF6B4262783E
        requirement_id: REQ-predicate-applicability-threshold
        fact_id: FACT-strong-applicability-score
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 0.8
          value_type: real
          variable: strong_score
---
Proves that a strong predicate applicability score shall be 0.8, against the code Kibi reads at ingest.