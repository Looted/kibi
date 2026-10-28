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
    receipt_id: PR-2ff43f5be3546a04021e340a
    test_id: TEST-proof-legacy-link-mark-action
    scope: unit
    outcome: passed
    code_snapshot: fed4ebb783f2658a2b1a7673268d9b0ffcf80faa0d1f59c186900196eec682cc
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:36:41.404Z'
    finished_at: '2026-10-28T20:36:41.567Z'
    artifact_digest: c2c6adab8888e3a68214a5fd79fdcd59064f677e9aa0fdd0d79de2b9205198a7
    contract_hash: 5469ac6c04fef76dc4f1ffa7ffb85c55b384ee974d7e81588378b5fe2c2cdf14
    binding_hash: 2a12acdf86390c4664581367e06a80ba849d73c719b5eb8d696a880e33bc0693
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
        requirement_id: REQ-cli-migration-pin-codes
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