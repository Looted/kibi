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
    receipt_id: PR-6d28de5afe0a69ecb9d2bb19
    test_id: TEST-proof-origin-backfill-action
    scope: unit
    outcome: passed
    code_snapshot: dc0be4d5803f22ca38ce1004b6769d2368029ae49edea82620e6c6618cbf4d3a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T18:52:43.006Z'
    finished_at: '2026-10-28T18:52:43.144Z'
    artifact_digest: 8e373ae6eb79f30b5b524f71a617e04d155bf4992d6a7dc27a03b35efd0d36bf
    contract_hash: 4ff5a9941b4ced03e9fafcdc4d1e27909d421dd0ed7a53341c77dcb478bdc60f
    binding_hash: 9c5f83e44bcf79a2fab8f96945731918a410a7870cd3b510efde00d60adb60fa
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