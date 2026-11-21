---
title: The symbol granularity violation code shall be SYMBOL_GRANULARITY_VIOLATION, by a regex proof
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
    - symbol_id: SYM-proof-granularity-violation-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-SYMBOL-GRANULARITY-VIOLATION
  proves:
    - CLAIM-117ABEF987E239AF
origin:
  kind: agent
  recorded_at: '2026-10-28T19:10:57.647Z'
id: TEST-proof-granularity-violation-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9940d61ddd36f1877181f79e
    test_id: TEST-proof-granularity-violation-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 86c2b07c80610d1a5a7362b2a1cd8d276be669b5323070cabca84a029ea79e75
    binding_hash: 15194d9edb2e5ca2e8a06c829af687c84112ff6bf3d5395318d2bfb200daa08d
    fingerprint: e21143549379ea54f39e27591f5c16ce4210e83a227716e5a9da850d12f21cad
    fingerprint_components:
      contract: 86c2b07c80610d1a5a7362b2a1cd8d276be669b5323070cabca84a029ea79e75
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
      - symbol_id: SYM-proof-granularity-violation-code
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
      test_id: TEST-proof-granularity-violation-code
      pattern:
        symbol_id: SYM-SYMBOL-GRANULARITY-VIOLATION
        type: string
        value: SYMBOL_GRANULARITY_VIOLATION
    certificate_digest: 9a2da9b60ab2340353afa471184a41180936aefe7f47f2ae8805c31dc886a50d
    claim_bindings:
      - claim_key: CLAIM-117ABEF987E239AF
        requirement_id: REQ-symbol-granularity-vocabulary
        fact_id: FACT-granularity-violation-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: SYMBOL_GRANULARITY_VIOLATION
---
Proves that the symbol granularity violation code shall be SYMBOL_GRANULARITY_VIOLATION, against the code Kibi reads at ingest.