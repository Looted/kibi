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
    receipt_id: PR-0d3654100e20849688a11f83
    test_id: TEST-proof-brand-mist-color
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: e9b962d85804cb5b3159b24a6af06978d018c32b3fbd7f331d210c6f51495065
    binding_hash: 1bd20988f3c34d8ac6e82401c9e205e07508cb3c0ae4fd794f7eeace70f89b74
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