---
title: The legacy symbol link mark action id shall be symbol-legacy-link-mark, by a regex proof
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
    - symbol_id: SYM-proof-legacy-link-mark-action
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-symbol-legacy-link-mark-action-id
  proves:
    - CLAIM-AE6690A5E75ECDEF
origin:
  kind: agent
  recorded_at: '2026-10-28T20:32:51.733Z'
id: TEST-proof-legacy-link-mark-action
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-20a0eb2b5c6253a328d2a1b4
    test_id: TEST-proof-legacy-link-mark-action
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 5469ac6c04fef76dc4f1ffa7ffb85c55b384ee974d7e81588378b5fe2c2cdf14
    binding_hash: 2f2c7188c36f40d146f7ae87893e206634677095e5f29a7a6a68cd63b1e9675f
    fingerprint: eaafaf33430273eef03bc768a5968608749ddaf13a5a88f52b66287ef4692c0b
    fingerprint_components:
      contract: 5469ac6c04fef76dc4f1ffa7ffb85c55b384ee974d7e81588378b5fe2c2cdf14
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
      - symbol_id: SYM-proof-legacy-link-mark-action
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
      test_id: TEST-proof-legacy-link-mark-action
      pattern:
        symbol_id: SYM-const-symbol-legacy-link-mark-action-id
        type: string
        value: symbol-legacy-link-mark
    certificate_digest: ec2396c82f16fbe4bf6e4ffae19bd1c3e9a21ffc2a225b3c465b7fa5b19c9203
    claim_bindings:
      - claim_key: CLAIM-AE6690A5E75ECDEF
        requirement_id: REQ-cli-migration-symbol-codes
        fact_id: FACT-legacy-link-mark-action
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: symbol-legacy-link-mark
---
Proves that the legacy symbol link mark action id shall be symbol-legacy-link-mark, against the code Kibi reads at ingest.