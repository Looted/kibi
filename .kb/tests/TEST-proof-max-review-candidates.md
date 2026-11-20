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
    receipt_id: PR-c820d2c15666bdf6713bab83
    test_id: TEST-proof-max-review-candidates
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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