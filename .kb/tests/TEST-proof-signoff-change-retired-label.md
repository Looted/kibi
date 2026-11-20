---
title: The signoff label of a retired change shall be Superseded or retired, by a regex proof
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
    - symbol_id: SYM-proof-signoff-change-retired-label
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-change-labels
    export: SIGNOFF_CHANGE_LABELS.retired
  proves:
    - CLAIM-2AD8CEB028472F05
origin:
  kind: agent
  recorded_at: '2026-10-28T22:24:51.495Z'
id: TEST-proof-signoff-change-retired-label
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4b3c15cdbe296c0c90a2b6b9
    test_id: TEST-proof-signoff-change-retired-label
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 59420d3dc0626f3673126584cd5419ac6633ac64c69b81307193b1e7a4183cfc
    binding_hash: d37db78e1f35b4493a6cef3304086e7d19f95ca192d445a64d30fb9c7144791a
    fingerprint: 758fb5068d55f1dde352c2ef3f0bd1100a57edbec52c5cba9f6796d317fe91f2
    fingerprint_components:
      contract: 59420d3dc0626f3673126584cd5419ac6633ac64c69b81307193b1e7a4183cfc
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
      - symbol_id: SYM-proof-signoff-change-retired-label
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
      test_id: TEST-proof-signoff-change-retired-label
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-change-labels
        type: string
        value: Superseded or retired
    certificate_digest: 0cc94c9379e9e24d3792cce64942d9753e38ff73c37193b066611f39f6a2a21e
    claim_bindings:
      - claim_key: CLAIM-2AD8CEB028472F05
        requirement_id: REQ-kibi-signoff-labels
        fact_id: FACT-signoff-change-retired-label
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: Superseded or retired
---
Proves that the signoff label of a retired change shall be Superseded or retired, against the code Kibi reads at ingest.