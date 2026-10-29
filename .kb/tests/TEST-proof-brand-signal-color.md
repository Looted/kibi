---
title: 'The Kibi signal brand colour shall be #3e8ed6, by a regex proof'
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
    - symbol_id: SYM-proof-brand-signal-color
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-report-brand-tokens
    export: KIBI_BRAND.signal
  proves:
    - CLAIM-A8769894894F68D8
origin:
  kind: agent
  recorded_at: '2026-10-28T22:29:15.401Z'
id: TEST-proof-brand-signal-color
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b861225138987dadc4f1b682
    test_id: TEST-proof-brand-signal-color
    scope: unit
    outcome: passed
    code_snapshot: 0a46a168f79f32c7067fd54b62e7bfea277eb1d3f88ddceab97c98613f8e5f74
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:32:44.393Z'
    finished_at: '2026-10-28T22:32:44.485Z'
    artifact_digest: 019b533e383fc00dc143204a0323a90ac3dd4fc679f0b73712010be2db397194
    contract_hash: a83cb4a23ea220d994d5cb679aa82842b067c4d0b5fcec45bce1bd3367211a79
    binding_hash: 26f663129222a11f1020e8ec3031c4c452c9e9b3a10ee881155deb77386101ed
    fingerprint: dc79782aa6241cf7493a1dd95a39bf7dc78d465ba9feab1414a9a562eba6ddc1
    fingerprint_components:
      contract: a83cb4a23ea220d994d5cb679aa82842b067c4d0b5fcec45bce1bd3367211a79
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
      - symbol_id: SYM-proof-brand-signal-color
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
      test_id: TEST-proof-brand-signal-color
      pattern:
        symbol_id: SYM-cli-report-brand-tokens
        type: string
        value: '#3e8ed6'
    certificate_digest: 62923888884eaa66163c2eab0b7ed7316ccd8f9328bcd4d324a59ee58c976ef9
    claim_bindings:
      - claim_key: CLAIM-A8769894894F68D8
        requirement_id: REQ-kibi-report-brand-colors
        fact_id: FACT-brand-signal-color
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: '#3e8ed6'
---
Proves that the Kibi signal brand colour shall be #3e8ed6, against the code Kibi reads at ingest.