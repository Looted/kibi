---
title: The built-in claim similarity threshold shall be 0.75, by an arithmetic proof
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
    - symbol_id: SYM-proof-builtin-claim-similarity-threshold
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-builtin-claim-similarity-threshold
  proves:
    - CLAIM-50F8B11033E58CB8
origin:
  kind: agent
  recorded_at: '2026-10-28T10:45:20.653Z'
id: TEST-proof-builtin-claim-similarity-threshold
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e76748b2ac6b478c8b66659d
    test_id: TEST-proof-builtin-claim-similarity-threshold
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: df3afacb9a5120e3454dd7785013b272bbaea208f84a7b9828aea266c0ba2ef1
    binding_hash: 01d7a7d786d6cb956a42e6a33f3887efc0526a9c022e8c5b3f02a31598d65135
    fingerprint: 14ce7738bb087ec7e2b2faefcf7953247bba8c01a2caf2f4bb65546ca0fadef4
    fingerprint_components:
      contract: df3afacb9a5120e3454dd7785013b272bbaea208f84a7b9828aea266c0ba2ef1
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
      - symbol_id: SYM-proof-builtin-claim-similarity-threshold
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
      test_id: TEST-proof-builtin-claim-similarity-threshold
      variable: claim_similarity_threshold
      value_type: real
      assumptions:
        - operator: eq
          value: 0.75
      claim:
        operator: eq
        value: 0.75
    certificate_digest: af3c58e790c387ab752de9ba682ee7786e08892faaa108786133e0feebca39fd
    claim_bindings:
      - claim_key: CLAIM-50F8B11033E58CB8
        requirement_id: REQ-kibi-vocabulary-alignment-settings
        fact_id: FACT-builtin-claim-similarity-threshold
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 0.75
          value_type: real
          variable: claim_similarity_threshold
---
Proves that the built-in claim similarity threshold shall be 0.75, against the code Kibi reads at ingest.