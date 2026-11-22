---
title: Derived symbol coordinates shall start at KB schema version 13, by an arithmetic proof
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
    - symbol_id: SYM-proof-derived-coordinates-schema
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-derived-coordinates-schema-version
  proves:
    - CLAIM-6C377382E2EA545C
origin:
  kind: agent
  recorded_at: '2026-10-28T20:34:03.024Z'
id: TEST-proof-derived-coordinates-schema
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bfdbc7d2e0f210367bdb19b9
    test_id: TEST-proof-derived-coordinates-schema
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 85d1f8b8db474398432a6e869b5a477f869ba3caae0aa1e04d8f59eb868bc549
    binding_hash: 894561e1e5d345a9ad4cb859c2713481a66d55332c50d7595e1a332612ca8935
    fingerprint: 186877849f77a2793a80673ed374d09360d8876ac78a2c835d3a270aaa7b6599
    fingerprint_components:
      contract: 85d1f8b8db474398432a6e869b5a477f869ba3caae0aa1e04d8f59eb868bc549
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
      - symbol_id: SYM-proof-derived-coordinates-schema
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
      test_id: TEST-proof-derived-coordinates-schema
      variable: derived_coordinates_schema
      value_type: int
      assumptions:
        - operator: eq
          value: 13
      claim:
        operator: eq
        value: 13
    certificate_digest: 55cdbe5e30dae164aa59ad2692485b46de7bea183680afc247df1e8c34c704c6
    claim_bindings:
      - claim_key: CLAIM-6C377382E2EA545C
        requirement_id: REQ-cli-migration-symbol-codes
        fact_id: FACT-derived-coordinates-schema
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 13
          value_type: int
          variable: derived_coordinates_schema
---
Proves that derived symbol coordinates shall start at KB schema version 13, against the code Kibi reads at ingest.