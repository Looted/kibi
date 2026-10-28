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
    receipt_id: PR-9357be76ceba44e0dacefdbb
    test_id: TEST-proof-entity-type-backfill-action
    scope: unit
    outcome: passed
    code_snapshot: 6c5b25823ef6cbf009fe70ee8955458c0021056cbc5b1d725647c41af19ef199
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:44:45.697Z'
    finished_at: '2026-10-28T17:44:45.863Z'
    artifact_digest: 474d3c40b372ba0bd53e2cc953e6306542839774b45b6031f51f6dec0f8145a1
    contract_hash: 7ebe3d7806e7a32e3e1f5c9c3b8b4f12fabb69c402347c8b081a3fdb0a5f1ef7
    binding_hash: 524dee1e9aaf39bc832874c8926a34410a3cb8b4579da28d4dafcce22c98bc60
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