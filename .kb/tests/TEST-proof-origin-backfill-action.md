---
title: The entity origin backfill action id shall be entity-origin-backfill, by a regex proof
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
    - symbol_id: SYM-proof-origin-backfill-action
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-entity-origin-backfill-action-id
  proves:
    - CLAIM-93CB07992A555443
origin:
  kind: agent
  recorded_at: '2026-10-28T18:49:26.962Z'
id: TEST-proof-origin-backfill-action
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a1fe0b4161116f2f1a9ac45c
    test_id: TEST-proof-origin-backfill-action
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 4ff5a9941b4ced03e9fafcdc4d1e27909d421dd0ed7a53341c77dcb478bdc60f
    binding_hash: b69a5742bde636a97e314190e17a5cbed860ec0b87372377c614edbc7bba9368
    fingerprint: 269bdb6c90d9e651786843bdc4131f02e93d9ca35d12cdcbb37704f975b6c6cc
    fingerprint_components:
      contract: 4ff5a9941b4ced03e9fafcdc4d1e27909d421dd0ed7a53341c77dcb478bdc60f
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
      - symbol_id: SYM-proof-origin-backfill-action
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
      test_id: TEST-proof-origin-backfill-action
      pattern:
        symbol_id: SYM-migration-entity-origin-backfill-action-id
        type: string
        value: entity-origin-backfill
    certificate_digest: 17ed1924239616aa5fc1bea0b059d6ef15de77e4c6239bc2a58377c7a99f40f0
    claim_bindings:
      - claim_key: CLAIM-93CB07992A555443
        requirement_id: REQ-cli-schema-migration-codes
        fact_id: FACT-origin-backfill-action
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: entity-origin-backfill
---
Proves that the entity origin backfill action id shall be entity-origin-backfill, against the code Kibi reads at ingest.