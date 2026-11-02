---
title: A semantic advisor case preview shall list at most 12 cases for one fact, by an arithmetic proof
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
    - symbol_id: SYM-proof-advisor-case-preview-limit
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  proves:
    - CLAIM-1C3E1A366E29113D
  value_source:
    - symbol_id: SYM-const-case-preview-limit
origin:
  kind: agent
  recorded_at: '2026-10-30T19:41:36.763Z'
id: TEST-proof-advisor-case-preview-limit
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9be3a35636d437cd5d046357
    test_id: TEST-proof-advisor-case-preview-limit
    scope: unit
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:45:20.226Z'
    finished_at: '2026-10-30T19:45:20.343Z'
    artifact_digest: dd985819e100dd62e286326ab354aabf1fed5e612e8407c891f82dc390dcbca9
    contract_hash: 44477fbc8ecd26c9ce7a1155e0f3cc5d628df6f803b67a83d6e9596effbb2d96
    binding_hash: 5beae38bdaa7008167e064426a6f7b5eb3078e67c6dca8a5071c30ad92d6bf6c
    fingerprint: ba8002bf85286be663db66aa8ac4d8739c2c35cafeac689fd62b5567bc6ccb5b
    fingerprint_components:
      contract: 44477fbc8ecd26c9ce7a1155e0f3cc5d628df6f803b67a83d6e9596effbb2d96
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
      - symbol_id: SYM-proof-advisor-case-preview-limit
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
      test_id: TEST-proof-advisor-case-preview-limit
      variable: case_limit
      value_type: int
      assumptions:
        - operator: eq
          value: 12
      claim:
        operator: eq
        value: 12
    certificate_digest: 5b3e0f2c754517712b6f2c0736988d72395bed6e3763da1d415b8869818243a4
    claim_bindings:
      - claim_key: CLAIM-1C3E1A366E29113D
        requirement_id: REQ-advisor-case-preview-limit
        fact_id: FACT-advisor-case-preview-limit
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 12
          value_type: int
          variable: case_limit
---
Proves that a semantic advisor case preview shall list at most 12 cases for one fact, against the code Kibi reads at ingest.