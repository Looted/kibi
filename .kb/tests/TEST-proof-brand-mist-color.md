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
    receipt_id: PR-6c33b1dd47f90d2fa470910e
    test_id: TEST-proof-brand-mist-color
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
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