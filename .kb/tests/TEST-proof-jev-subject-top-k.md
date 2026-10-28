---
title: The Jev vocabulary alignment shall rank at most 5 subject candidates, by an arithmetic proof
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
    - symbol_id: SYM-proof-jev-subject-top-k
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-jev-subject-top-k
  proves:
    - CLAIM-C2B6CB8DA753C27B
origin:
  kind: agent
  recorded_at: '2026-10-28T10:45:44.392Z'
id: TEST-proof-jev-subject-top-k
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-279c38c28eb875344d223e7d
    test_id: TEST-proof-jev-subject-top-k
    scope: unit
    outcome: passed
    code_snapshot: 95a215c6d20126c89df30d26a323349cf6e7ee9aa9002e5ee1935fc5b3c6bf78
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:48:16.556Z'
    finished_at: '2026-10-28T10:48:16.684Z'
    artifact_digest: 690d6228494f095b8701db32ce47acd1a9197d30989a15156fc9e519522ab97e
    contract_hash: e6603dc15a0b8a56eac42b797ecc7b4ffd4967224370d0f4d4cc960a367e5edb
    binding_hash: 38250efc59433f48fdcc738c66a3b1a1d20855a496f0b447bd9b629c71b05501
    fingerprint: dfb6340a8ad1f4a26903a5dd4d73f6809a7596107a83fca9e09b9903e5a30d28
    fingerprint_components:
      contract: e6603dc15a0b8a56eac42b797ecc7b4ffd4967224370d0f4d4cc960a367e5edb
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
      - symbol_id: SYM-proof-jev-subject-top-k
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
      test_id: TEST-proof-jev-subject-top-k
      variable: jev_subject_top_k
      value_type: int
      assumptions:
        - operator: eq
          value: 5
      claim:
        operator: eq
        value: 5
    certificate_digest: 19f9288e6984772bb48f0b6d90f865f2775c2e5842d49bb1609c2a761635b779
    claim_bindings:
      - claim_key: CLAIM-C2B6CB8DA753C27B
        requirement_id: REQ-kibi-vocabulary-alignment-settings
        fact_id: FACT-jev-subject-top-k
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 5
          value_type: int
          variable: jev_subject_top_k
---
Proves that the Jev vocabulary alignment shall rank at most 5 subject candidates, against the code Kibi reads at ingest.