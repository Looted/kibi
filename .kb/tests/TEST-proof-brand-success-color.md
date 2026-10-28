---
title: 'The Kibi success brand colour shall be #63c99a, by a regex proof'
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
    - symbol_id: SYM-proof-brand-success-color
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-report-brand-tokens
    export: KIBI_BRAND.success
  proves:
    - CLAIM-1987F08DB1A22339
origin:
  kind: agent
  recorded_at: '2026-10-28T22:30:20.963Z'
id: TEST-proof-brand-success-color
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-80679c681c54787103afa2b4
    test_id: TEST-proof-brand-success-color
    scope: unit
    outcome: passed
    code_snapshot: 0a46a168f79f32c7067fd54b62e7bfea277eb1d3f88ddceab97c98613f8e5f74
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:33:05.025Z'
    finished_at: '2026-10-28T22:33:05.116Z'
    artifact_digest: 85342dc628fdc984eb9a85232cc9b042dd8638306e791a9e6f71a562ee17b1dc
    contract_hash: 41fd55733e4b89bff8c497772d85f17406a7413f3619be7fc1ce2ee033342fbe
    binding_hash: d73b2a8854bea7f06b63c21d130d5d218a6807281fa7fa547f5bec76f61ef480
    fingerprint: f0423f94b502397fbd99071759e134cace69917bb644f0ef6aae6c1c49cf33f7
    fingerprint_components:
      contract: 41fd55733e4b89bff8c497772d85f17406a7413f3619be7fc1ce2ee033342fbe
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
      - symbol_id: SYM-proof-brand-success-color
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
      test_id: TEST-proof-brand-success-color
      pattern:
        symbol_id: SYM-cli-report-brand-tokens
        type: string
        value: '#63c99a'
    certificate_digest: 68f50208cf986753a04df09ce426ea6ba7e42f6cf6fc5b260e05102524a5cd37
    claim_bindings:
      - claim_key: CLAIM-1987F08DB1A22339
        requirement_id: REQ-kibi-report-brand-colors
        fact_id: FACT-brand-success-color
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: '#63c99a'
---
Proves that the Kibi success brand colour shall be #63c99a, against the code Kibi reads at ingest.