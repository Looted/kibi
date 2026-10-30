---
title: The migration sync action id shall be migration-sync, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-migration-sync-action
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-MIGRATION_SYNC_ACTION_ID
  proves:
    - CLAIM-AC4230B73B003ADA
origin:
  kind: agent
  recorded_at: '2026-10-28T17:28:52.592Z'
id: TEST-proof-migration-sync-action
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1521bb4bfa2b5062cf67770b
    test_id: TEST-proof-migration-sync-action
    scope: unit
    outcome: passed
    code_snapshot: 4b699c9b07afd709892fdd2513cb5f73a7167d1881b1a2daf6c70078e8f98147
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:31:14.328Z'
    finished_at: '2026-10-28T17:31:14.481Z'
    artifact_digest: 960100c85916b4d891a882eb834a86e75ebf273e3d73e50fae3c7719d25ea211
    contract_hash: 481dd6a0ef144cca193cfe035355738291a2e063abae7552a4c9b8ab937b4321
    binding_hash: f3be43f6111eb72bd0581c7b616cc4c5d8c4371de76cf93058d3b6f0fbefbab4
    fingerprint: 7bc6761e4f9641151250335a62bdac286fd0c4e8d28f85f339e7deca7440b413
    fingerprint_components:
      contract: 481dd6a0ef144cca193cfe035355738291a2e063abae7552a4c9b8ab937b4321
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
      - symbol_id: SYM-proof-migration-sync-action
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-migration-sync-action
      pattern:
        symbol_id: SYM-schema6-check-actions-MIGRATION_SYNC_ACTION_ID
        type: string
        value: migration-sync
    certificate_digest: c43c4bd3e7340f909fb69334b162e5d1e4003f8b2ffed67b1682bdae8afc4647
    claim_bindings:
      - claim_key: CLAIM-AC4230B73B003ADA
        requirement_id: REQ-kibi-lifecycle-check-codes
        fact_id: FACT-migration-sync-action
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: migration-sync
---
Proves that the migration sync action id shall be migration-sync, against the code Kibi reads at ingest.