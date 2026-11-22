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
    receipt_id: PR-db12d19822ba9c3f34b37839
    test_id: TEST-proof-legacy-link-mark-action
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
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