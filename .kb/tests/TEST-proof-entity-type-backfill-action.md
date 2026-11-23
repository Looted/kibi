---
title: The entity type backfill action id shall be entity-type-backfill, by a regex proof
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
    - symbol_id: SYM-proof-entity-type-backfill-action
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-entity-type-backfill-action-id
  proves:
    - CLAIM-F2939200E1E5CA64
origin:
  kind: agent
  recorded_at: '2026-10-28T17:43:19.155Z'
id: TEST-proof-entity-type-backfill-action
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e1fcb5c727a31203f462f1b7
    test_id: TEST-proof-entity-type-backfill-action
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 7ebe3d7806e7a32e3e1f5c9c3b8b4f12fabb69c402347c8b081a3fdb0a5f1ef7
    binding_hash: dc6e2c7f58c86ee753cb42f5097c9a8ef6fe67aecbeb5f55c90007375034a72b
    fingerprint: 55229ce9a58a429a795998310d7ce16715f8e750513f1eb97447f930f754fd21
    fingerprint_components:
      contract: 7ebe3d7806e7a32e3e1f5c9c3b8b4f12fabb69c402347c8b081a3fdb0a5f1ef7
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
      - symbol_id: SYM-proof-entity-type-backfill-action
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
      test_id: TEST-proof-entity-type-backfill-action
      pattern:
        symbol_id: SYM-migration-entity-type-backfill-action-id
        type: string
        value: entity-type-backfill
    certificate_digest: bf32731ea1fa3fdb593e903c63cbad2a346f745e521dfb7dfaee6c20c2d60873
    claim_bindings:
      - claim_key: CLAIM-F2939200E1E5CA64
        requirement_id: REQ-cli-migration-action-codes
        fact_id: FACT-entity-type-backfill-action
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: entity-type-backfill
---
Proves that the entity type backfill action id shall be entity-type-backfill, against the code Kibi reads at ingest.