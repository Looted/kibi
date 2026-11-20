---
title: The superseded symbol owner review code shall be review_symbol_owner_superseded, by a regex proof
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
    - symbol_id: SYM-proof-symbol-owner-review-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-SYMBOL_OWNER_REVIEW_CODE
  proves:
    - CLAIM-9646A15E0E142800
origin:
  kind: agent
  recorded_at: '2026-10-28T17:29:53.079Z'
id: TEST-proof-symbol-owner-review-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1881ce033b59e7e1f0188fc7
    test_id: TEST-proof-symbol-owner-review-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 90d9f50e6b5dcd914aba82e1d212a2059cbb8ce496fbb6b8116779149d330af2
    binding_hash: 04c26e3700583e1cce00f17c9986cebaefa9c2fa17328e2cd61602ed87ef60fe
    fingerprint: bcabd0937563cc9f7c6f90213493145a089118b5d0150783ee8665327ccc1324
    fingerprint_components:
      contract: 90d9f50e6b5dcd914aba82e1d212a2059cbb8ce496fbb6b8116779149d330af2
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
      - symbol_id: SYM-proof-symbol-owner-review-code
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
      test_id: TEST-proof-symbol-owner-review-code
      pattern:
        symbol_id: SYM-schema6-check-actions-SYMBOL_OWNER_REVIEW_CODE
        type: string
        value: review_symbol_owner_superseded
    certificate_digest: ce96749a447968f3d0078403ffd7fc49c0bc60d9607f8dc08720651ac3d78f1e
    claim_bindings:
      - claim_key: CLAIM-9646A15E0E142800
        requirement_id: REQ-kibi-lifecycle-review-codes
        fact_id: FACT-symbol-owner-review-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review_symbol_owner_superseded
---
Proves that the superseded symbol owner review code shall be review_symbol_owner_superseded, against the code Kibi reads at ingest.