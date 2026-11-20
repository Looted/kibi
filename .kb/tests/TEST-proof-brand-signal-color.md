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
    receipt_id: PR-9f44900a4579dce4019dfbe2
    test_id: TEST-proof-brand-signal-color
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: a83cb4a23ea220d994d5cb679aa82842b067c4d0b5fcec45bce1bd3367211a79
    binding_hash: b1ff837c5c89552e3dfdcb2afc0ea7376065931243dbdb13e68eb090ce3ec26c
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