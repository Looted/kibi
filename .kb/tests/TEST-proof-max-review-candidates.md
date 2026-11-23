---
title: Contradiction review shall list at most 5 candidates, by an arithmetic proof
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
    - symbol_id: SYM-proof-max-review-candidates
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-max-review-candidates
  proves:
    - CLAIM-2CA8BAB8AAE97CF4
origin:
  kind: agent
  recorded_at: '2026-10-28T10:43:39.246Z'
id: TEST-proof-max-review-candidates
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3f4ae58d4918c5e5d2872b57
    test_id: TEST-proof-max-review-candidates
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 5321271a74bb113abb857f45fc73f8f6396a8a18a80bb3fdb283871759428432
    binding_hash: 437449f1ced8930483e3e04284b4b2871204bbf39b420307f4cd537d25a424cb
    fingerprint: e35238913f5e9fbb0a90bcb660628bc4e33a70e13203e224b387717839f5c3c7
    fingerprint_components:
      contract: 5321271a74bb113abb857f45fc73f8f6396a8a18a80bb3fdb283871759428432
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
      - symbol_id: SYM-proof-max-review-candidates
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
      test_id: TEST-proof-max-review-candidates
      variable: max_candidates
      value_type: int
      assumptions:
        - operator: eq
          value: 5
      claim:
        operator: eq
        value: 5
    certificate_digest: ff6b94de686bb5c30a3260c76f800c0e68437fbfec4765f1fa001b9ca62790da
    claim_bindings:
      - claim_key: CLAIM-2CA8BAB8AAE97CF4
        requirement_id: REQ-kibi-contradiction-review-limits
        fact_id: FACT-max-review-candidates
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 5
          value_type: int
          variable: max_candidates
---
Proves that contradiction review shall list at most 5 candidates, against the code Kibi reads at ingest.