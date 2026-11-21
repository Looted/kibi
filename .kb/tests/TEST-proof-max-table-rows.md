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
    receipt_id: PR-14e39d87fd815ddad69ac59f
    test_id: TEST-proof-max-table-rows
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 262bdeaaa74f1fd569c7beefeea65d1d3cfa6e8f2ed894ad57100f54e79dad8c
    binding_hash: 4f595ef37b54de855e990326a2c810873491c738905efc98b7cf117114422a88
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