---
title: 'The Kibi mist brand colour shall be #aab8c2, by a regex proof'
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
    - symbol_id: SYM-proof-brand-mist-color
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-report-brand-tokens
    export: KIBI_BRAND.mist
  proves:
    - CLAIM-F2A54738EC65C71E
origin:
  kind: agent
  recorded_at: '2026-10-28T22:29:48.247Z'
id: TEST-proof-brand-mist-color
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1733b54357ce12e098133be1
    test_id: TEST-proof-brand-mist-color
    scope: unit
    outcome: passed
    code_snapshot: 0a46a168f79f32c7067fd54b62e7bfea277eb1d3f88ddceab97c98613f8e5f74
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:32:54.693Z'
    finished_at: '2026-10-28T22:32:54.785Z'
    artifact_digest: 9335783a8bdfc2447f62df56bdaa132d9974d4e89e1528b0e3d0c3663d3e7c59
    contract_hash: e9b962d85804cb5b3159b24a6af06978d018c32b3fbd7f331d210c6f51495065
    binding_hash: 19ccbca7d44a31b9d664deddbe9c00b3ea2b3db4287d75368bda4052cd70e51f
    fingerprint: 219764454a3b2d97cf0c92cf0a91c73231c928f5fbe81f67c30767fd6684d96b
    fingerprint_components:
      contract: e9b962d85804cb5b3159b24a6af06978d018c32b3fbd7f331d210c6f51495065
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
      - symbol_id: SYM-proof-brand-mist-color
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
      test_id: TEST-proof-brand-mist-color
      pattern:
        symbol_id: SYM-cli-report-brand-tokens
        type: string
        value: '#aab8c2'
    certificate_digest: ed180cb4744d520ce5f3d2594cf92b8d8fb6e788ba56d21d9f1c27cf822d8d4b
    claim_bindings:
      - claim_key: CLAIM-F2A54738EC65C71E
        requirement_id: REQ-kibi-report-brand-colors
        fact_id: FACT-brand-mist-color
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: '#aab8c2'
---
Proves that the Kibi mist brand colour shall be #aab8c2, against the code Kibi reads at ingest.