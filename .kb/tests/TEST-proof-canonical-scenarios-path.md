---
title: The canonical scenarios path shall be .kb/scenarios, by a regex proof
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
    - symbol_id: SYM-proof-canonical-scenarios-path
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
    export: CANONICAL_ENTITY_PATHS.scenarios
  proves:
    - CLAIM-2A79EAA4A7A13052
origin:
  kind: agent
  recorded_at: '2026-10-28T22:34:33.219Z'
id: TEST-proof-canonical-scenarios-path
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c4a99be8ab6152a0efbc001a
    test_id: TEST-proof-canonical-scenarios-path
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 6bfe6f52ebeb1591c88b5aa0abf20479e49f4868bdfd464a9890f3a3ed3ebfd0
    binding_hash: 5bab647933d033a9a4fb3f8f8f6ba51e6dc6d1c138b0e7fed4866a8415a9f448
    fingerprint: f775d89c31bd434796e8130f61c3b9a1ce4bde872a431373833a036685ba8f1b
    fingerprint_components:
      contract: 6bfe6f52ebeb1591c88b5aa0abf20479e49f4868bdfd464a9890f3a3ed3ebfd0
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
      - symbol_id: SYM-proof-canonical-scenarios-path
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
      test_id: TEST-proof-canonical-scenarios-path
      pattern:
        symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
        type: string
        value: .kb/scenarios
    certificate_digest: 4b4163b571386f718b27e9ef36cb9cc59dac081dae65aedab34f95279a5c784e
    claim_bindings:
      - claim_key: CLAIM-2A79EAA4A7A13052
        requirement_id: REQ-cli-kb-entity-paths
        fact_id: FACT-canonical-scenarios-path
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/scenarios
---
Proves that the canonical scenarios path shall be .kb/scenarios, against the code Kibi reads at ingest.