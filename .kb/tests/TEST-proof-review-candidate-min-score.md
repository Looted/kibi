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
    receipt_id: PR-13c1aaef6a0328d9b022751d
    test_id: TEST-proof-review-candidate-min-score
    scope: unit
    outcome: passed
    code_snapshot: b1dae14246c1aef7a2d6eaebf6dab00e998436d2871557a15fabb299789da157
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:44:19.724Z'
    finished_at: '2026-10-28T10:44:19.859Z'
    artifact_digest: 15bf91c359329ca64e213de7b00cb14bf6ff8d22882d7528655b6b3421306be9
    contract_hash: fea3e57a06e3c245c47abf6c6923860230a0608a3a59cb4119180d53099a8db5
    binding_hash: 262e5ece534f786b6b3ca95c50535bfed43de545cd908f029c187640d6be7d28
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