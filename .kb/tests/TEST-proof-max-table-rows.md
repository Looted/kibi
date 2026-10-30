---
title: A proof table model shall hold at most 100000 rows, by an arithmetic proof
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
    - symbol_id: SYM-proof-max-table-rows
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-max-table-rows
  proves:
    - CLAIM-5D32157CFE2F143E
origin:
  kind: agent
  recorded_at: '2026-10-28T20:38:41.408Z'
id: TEST-proof-max-table-rows
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-286267308c8e217f154748a0
    test_id: TEST-proof-max-table-rows
    scope: unit
    outcome: passed
    code_snapshot: bc1213c2370b5f78c97ee31d99b3edbe5c80d361104c881245f13169e433a917
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:40:47.374Z'
    finished_at: '2026-10-28T20:40:47.522Z'
    artifact_digest: 264c1898a940e7bbcbe971f8d748a75dbcbd704f78d25ac0afa8693735544bfd
    contract_hash: 262bdeaaa74f1fd569c7beefeea65d1d3cfa6e8f2ed894ad57100f54e79dad8c
    binding_hash: 66da3ea39e4f3235d8d2914d33e95fc4a642b7d9d9407f4a72b496307333eda6
    fingerprint: 4105ce452c60d402f785b5e4200c39692c37209ec73d7910cb9d941650991b88
    fingerprint_components:
      contract: 262bdeaaa74f1fd569c7beefeea65d1d3cfa6e8f2ed894ad57100f54e79dad8c
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
      - symbol_id: SYM-proof-max-table-rows
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
      test_id: TEST-proof-max-table-rows
      variable: max_table_rows
      value_type: int
      assumptions:
        - operator: eq
          value: 100000
      claim:
        operator: eq
        value: 100000
    certificate_digest: e9a4ca15bfd07786633949d5b6defa2d8991851b0f8c0bbff0e78116f5a66f44
    claim_bindings:
      - claim_key: CLAIM-5D32157CFE2F143E
        requirement_id: REQ-kibi-code-certificate-settings
        fact_id: FACT-max-table-rows
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 100000
          value_type: int
          variable: max_table_rows
---
Proves that a proof table model shall hold at most 100000 rows, against the code Kibi reads at ingest.