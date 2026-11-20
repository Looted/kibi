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
    receipt_id: PR-7058e242533c2e6a8367be4f
    test_id: TEST-proof-canonical-tests-path
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 62fbe119f3b6060a4b90d6be521c5ce17e50a68ea3fe60d05e4b887726488481
    binding_hash: 3ac33565290434ab776cb889e1623e1eb7faab50439dc0a19a8e49dd2ebf8aac
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