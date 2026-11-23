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
    receipt_id: PR-1b6f4eaee4230d4acc28fa0a
    test_id: TEST-proof-signoff-change-new-label
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
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