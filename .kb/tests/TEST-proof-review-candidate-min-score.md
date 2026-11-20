---
title: The minimum contradiction review candidate score shall be 0.1, by an arithmetic proof
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
    - symbol_id: SYM-proof-review-candidate-min-score
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-review-candidate-min-score
  proves:
    - CLAIM-9C053936BB885A8E
origin:
  kind: agent
  recorded_at: '2026-10-28T10:43:15.600Z'
id: TEST-proof-review-candidate-min-score
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-55537b99747d15d703c33c81
    test_id: TEST-proof-review-candidate-min-score
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: fea3e57a06e3c245c47abf6c6923860230a0608a3a59cb4119180d53099a8db5
    binding_hash: fe57f681ddb9ce91bd6b7d449790c52e643dea95902a9fce0eb30e4004c35479
    fingerprint: cbe003fd50882369cf275f1cc433815d06fec4b71e096fcfba9b8fc64f0607cd
    fingerprint_components:
      contract: fea3e57a06e3c245c47abf6c6923860230a0608a3a59cb4119180d53099a8db5
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
      - symbol_id: SYM-proof-review-candidate-min-score
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
      test_id: TEST-proof-review-candidate-min-score
      variable: min_candidate_score
      value_type: real
      assumptions:
        - operator: eq
          value: 0.1
      claim:
        operator: eq
        value: 0.1
    certificate_digest: 4cd2e8523f8fa012bcec90fd4b63ae8438cf2b89b95d4d28e8e475e6cede6d82
    claim_bindings:
      - claim_key: CLAIM-9C053936BB885A8E
        requirement_id: REQ-kibi-contradiction-review-limits
        fact_id: FACT-review-candidate-min-score
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 0.1
          value_type: real
          variable: min_candidate_score
---
Proves that the minimum contradiction review candidate score shall be 0.1, against the code Kibi reads at ingest.