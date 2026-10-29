---
title: The canonical flags path shall be .kb/flags, by a regex proof
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
    - symbol_id: SYM-proof-canonical-flags-path
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
    export: CANONICAL_ENTITY_PATHS.flags
  proves:
    - CLAIM-9CE36E58447F43A6
origin:
  kind: agent
  recorded_at: '2026-10-28T22:35:21.861Z'
id: TEST-proof-canonical-flags-path
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d47a76d35549dfacb712c2c1
    test_id: TEST-proof-canonical-flags-path
    scope: unit
    outcome: passed
    code_snapshot: a7ee6e75591f23c8003fd7cb5df9dc7fcc2863290a587f8517f61d409fca336c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:38:00.540Z'
    finished_at: '2026-10-28T22:38:00.631Z'
    artifact_digest: f8b00f2dfd2e8828f84d9ce611fb4b070e92ba637cc76f562761f57288db3592
    contract_hash: 0c6030ab692001b9c601b278b6438696ca002243d815fb78b4fa1eb254fe5776
    binding_hash: cfb1e727a750f1e67492d2aa0aa6084378c7bb194b15e4d2054839bc4002e074
    fingerprint: eeb81be264bb32c94dd54c0da6c76d246c9d4557633bec463bc04b0b460fcc7b
    fingerprint_components:
      contract: 0c6030ab692001b9c601b278b6438696ca002243d815fb78b4fa1eb254fe5776
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
      - symbol_id: SYM-proof-canonical-flags-path
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
      test_id: TEST-proof-canonical-flags-path
      pattern:
        symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
        type: string
        value: .kb/flags
    certificate_digest: d0756fbd7652fca6f426886e8d2a2353d69a4df688dd3967d2786b12fc151f31
    claim_bindings:
      - claim_key: CLAIM-9CE36E58447F43A6
        requirement_id: REQ-cli-kb-entity-paths
        fact_id: FACT-canonical-flags-path
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/flags
---
Proves that the canonical flags path shall be .kb/flags, against the code Kibi reads at ingest.