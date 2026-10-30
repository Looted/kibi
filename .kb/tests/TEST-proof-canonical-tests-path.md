---
title: The canonical tests path shall be .kb/tests, by a regex proof
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
    - symbol_id: SYM-proof-canonical-tests-path
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
    export: CANONICAL_ENTITY_PATHS.tests
  proves:
    - CLAIM-719326D8135CC69E
origin:
  kind: agent
  recorded_at: '2026-10-28T22:34:49.550Z'
id: TEST-proof-canonical-tests-path
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f90359231c337c7441905fa5
    test_id: TEST-proof-canonical-tests-path
    scope: unit
    outcome: passed
    code_snapshot: a7ee6e75591f23c8003fd7cb5df9dc7fcc2863290a587f8517f61d409fca336c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:37:50.296Z'
    finished_at: '2026-10-28T22:37:50.387Z'
    artifact_digest: 7058ae1852495109b34061548d5141432cf1fcd2a410d491591b1a5d1f09a512
    contract_hash: 62fbe119f3b6060a4b90d6be521c5ce17e50a68ea3fe60d05e4b887726488481
    binding_hash: cfc2574ec02193d4eaa903396ba036bfe45bc4c970ba98afa2b1ee42f5bf2a47
    fingerprint: 40360ee604d3d2bf9849319fc3c7d2df944e02b631920951c619450b33024425
    fingerprint_components:
      contract: 62fbe119f3b6060a4b90d6be521c5ce17e50a68ea3fe60d05e4b887726488481
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
      - symbol_id: SYM-proof-canonical-tests-path
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
      test_id: TEST-proof-canonical-tests-path
      pattern:
        symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
        type: string
        value: .kb/tests
    certificate_digest: 090dbba1d1cff4968c49469ed59bb33d590976784b69011d2b9cb42a5f9c9017
    claim_bindings:
      - claim_key: CLAIM-719326D8135CC69E
        requirement_id: REQ-cli-kb-entity-paths
        fact_id: FACT-canonical-tests-path
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/tests
---
Proves that the canonical tests path shall be .kb/tests, against the code Kibi reads at ingest.