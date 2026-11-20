---
title: The signoff label of a new change shall be New, by a regex proof
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
    - symbol_id: SYM-proof-signoff-change-new-label
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-change-labels
    export: SIGNOFF_CHANGE_LABELS.new
  proves:
    - CLAIM-A60DF82872D0C155
origin:
  kind: agent
  recorded_at: '2026-10-28T22:24:14.557Z'
id: TEST-proof-signoff-change-new-label
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8d532e18245e19e84835b2b9
    test_id: TEST-proof-signoff-change-new-label
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 1d895ddbda624b08d4d887aacc772df2bd655bf875c321f810184af792fb1578
    binding_hash: 02fcdf9d3258fba4007b7cfdba0cf3082aa4182679c5cb701eb45d2cb4b70b44
    fingerprint: 62407b1ea210c501e537de0039dab807f2f07c7c22974b5a676a960d87c566c6
    fingerprint_components:
      contract: 1d895ddbda624b08d4d887aacc772df2bd655bf875c321f810184af792fb1578
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
      - symbol_id: SYM-proof-signoff-change-new-label
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
      test_id: TEST-proof-signoff-change-new-label
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-change-labels
        type: string
        value: New
    certificate_digest: ec3a562305f3a95e03e950ead61cb3671f22f1111b0ae1eacfcaed9d4fc6871b
    claim_bindings:
      - claim_key: CLAIM-A60DF82872D0C155
        requirement_id: REQ-kibi-signoff-labels
        fact_id: FACT-signoff-change-new-label
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: New
---
Proves that the signoff label of a new change shall be New, against the code Kibi reads at ingest.