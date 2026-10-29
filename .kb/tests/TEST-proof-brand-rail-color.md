---
title: 'The Kibi rail brand colour shall be #34434f, by a regex proof'
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
    - symbol_id: SYM-proof-brand-rail-color
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-report-brand-tokens
    export: KIBI_BRAND.rail
  proves:
    - CLAIM-8B4ECDDC8FDC79B6
origin:
  kind: agent
  recorded_at: '2026-10-28T22:30:04.396Z'
id: TEST-proof-brand-rail-color
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4adb83db03e57efff4c1b3c6
    test_id: TEST-proof-brand-rail-color
    scope: unit
    outcome: passed
    code_snapshot: 0a46a168f79f32c7067fd54b62e7bfea277eb1d3f88ddceab97c98613f8e5f74
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:32:59.870Z'
    finished_at: '2026-10-28T22:32:59.962Z'
    artifact_digest: 9474aceb8a6da398a2ffb05f2aae2b35727559d658b772450cd351b0a1c7259a
    contract_hash: e11a1f23d2c90dc83570a2748fd0d93bd15575010eb93c5b2597fc1b3e0dcaba
    binding_hash: c7b8ddb3dbcca53b0d9617a83540347ed4629673125f7e3a80ceee99b1daa19b
    fingerprint: 352ad2137d71add38dd70a5d451aeab5d24868e252d7354e2833def29e71bdb5
    fingerprint_components:
      contract: e11a1f23d2c90dc83570a2748fd0d93bd15575010eb93c5b2597fc1b3e0dcaba
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
      - symbol_id: SYM-proof-brand-rail-color
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
      test_id: TEST-proof-brand-rail-color
      pattern:
        symbol_id: SYM-cli-report-brand-tokens
        type: string
        value: '#34434f'
    certificate_digest: 08f54d5b2f22895f0f438a3ecc33356fed9e98ce079f1cb9e76c449563c7fb20
    claim_bindings:
      - claim_key: CLAIM-8B4ECDDC8FDC79B6
        requirement_id: REQ-kibi-report-brand-colors
        fact_id: FACT-brand-rail-color
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: '#34434f'
---
Proves that the Kibi rail brand colour shall be #34434f, against the code Kibi reads at ingest.