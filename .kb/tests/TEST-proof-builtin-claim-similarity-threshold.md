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
    receipt_id: PR-2ca7b688d1c6181727cdebce
    test_id: TEST-proof-builtin-claim-similarity-threshold
    scope: unit
    outcome: passed
    code_snapshot: 95a215c6d20126c89df30d26a323349cf6e7ee9aa9002e5ee1935fc5b3c6bf78
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:48:09.904Z'
    finished_at: '2026-10-28T10:48:10.024Z'
    artifact_digest: 9c8435909167f79d9882b3d3419fcceaf22a3794f29cce0660ff8598a360fab2
    contract_hash: df3afacb9a5120e3454dd7785013b272bbaea208f84a7b9828aea266c0ba2ef1
    binding_hash: d8e941018aa7c800d32cfd62fce04fab64960f583e125ef6acdbf247ed94ee1b
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