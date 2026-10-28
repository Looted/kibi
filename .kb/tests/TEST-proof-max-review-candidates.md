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
    receipt_id: PR-f934e4f7d8487a1cca4a932d
    test_id: TEST-proof-max-review-candidates
    scope: unit
    outcome: passed
    code_snapshot: b1dae14246c1aef7a2d6eaebf6dab00e998436d2871557a15fabb299789da157
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:44:25.845Z'
    finished_at: '2026-10-28T10:44:25.944Z'
    artifact_digest: c53eb690f423e10e2224b2bdbd04db343270c267c3cfffc36baed0751b380ae9
    contract_hash: 5321271a74bb113abb857f45fc73f8f6396a8a18a80bb3fdb283871759428432
    binding_hash: 4edcdb83cda3ae83ab2caffb3e42212b6e3417e8055f35f074a9250cdf35d968
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