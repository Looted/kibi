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
    receipt_id: PR-7d67261d53d6c03ee268b9c3
    test_id: TEST-proof-canonical-scenarios-path
    scope: unit
    outcome: passed
    code_snapshot: a7ee6e75591f23c8003fd7cb5df9dc7fcc2863290a587f8517f61d409fca336c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:37:45.157Z'
    finished_at: '2026-10-28T22:37:45.247Z'
    artifact_digest: 59c19ad3e01e2954d33f62fb33bed5560bcc8423e98d3e25be40213397f42d9d
    contract_hash: 6bfe6f52ebeb1591c88b5aa0abf20479e49f4868bdfd464a9890f3a3ed3ebfd0
    binding_hash: 0997250ad8fc1716d1fb43954224e49d3a846ec1e496df4718c6e2a2ead86843
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