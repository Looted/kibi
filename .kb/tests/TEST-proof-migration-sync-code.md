---
title: The migration sync code shall be migration_sync, by a regex proof
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
    - symbol_id: SYM-proof-migration-sync-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-MIGRATION_SYNC_CODE
  proves:
    - CLAIM-E19F7AFB24A77FE2
origin:
  kind: agent
  recorded_at: '2026-10-28T17:29:12.567Z'
id: TEST-proof-migration-sync-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-949d00242782df4c5d970a38
    test_id: TEST-proof-migration-sync-code
    scope: unit
    outcome: passed
    code_snapshot: 4b699c9b07afd709892fdd2513cb5f73a7167d1881b1a2daf6c70078e8f98147
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:31:20.311Z'
    finished_at: '2026-10-28T17:31:20.435Z'
    artifact_digest: 0cb4d56464414b5c225cc49345575ed3e88e557eb5882af01a41fad5a44b34b9
    contract_hash: 74f78ce037a9767469e876247d5167b52d56541c7f01794a9d71404886d987c1
    binding_hash: 29ae3be903953c0630977328aff67eab73cdebf76c358afa0dee43e2c07461d9
    fingerprint: f50a8856975a8a624456664f5789452bcd35ddc359a5930b778c719a959f71ac
    fingerprint_components:
      contract: 74f78ce037a9767469e876247d5167b52d56541c7f01794a9d71404886d987c1
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
      - symbol_id: SYM-proof-migration-sync-code
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
      test_id: TEST-proof-migration-sync-code
      pattern:
        symbol_id: SYM-schema6-check-actions-MIGRATION_SYNC_CODE
        type: string
        value: migration_sync
    certificate_digest: 0e9008e9659ac9bd5355dd1544ca97af83bffba730008aeefe2f2ccbbfdce47b
    claim_bindings:
      - claim_key: CLAIM-E19F7AFB24A77FE2
        requirement_id: REQ-kibi-lifecycle-check-codes
        fact_id: FACT-migration-sync-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: migration_sync
---
Proves that the migration sync code shall be migration_sync, against the code Kibi reads at ingest.