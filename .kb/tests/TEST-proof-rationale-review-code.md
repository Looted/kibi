---
title: The missing rationale review code shall be review_requirement_rationale_missing, by a regex proof
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
    - symbol_id: SYM-proof-rationale-review-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-RATIONALE_REVIEW_CODE
  proves:
    - CLAIM-0380F3C1816B850D
origin:
  kind: agent
  recorded_at: '2026-10-28T17:26:50.226Z'
id: TEST-proof-rationale-review-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f7823a9e27b871990f8c64e3
    test_id: TEST-proof-rationale-review-code
    scope: unit
    outcome: passed
    code_snapshot: 4b699c9b07afd709892fdd2513cb5f73a7167d1881b1a2daf6c70078e8f98147
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:30:38.621Z'
    finished_at: '2026-10-28T17:30:38.796Z'
    artifact_digest: 7ddfcdcf6da2b40a7cdf0c58aa6f2cc9c10f2e5bb50369d235b80aa502d47d65
    contract_hash: b162859af005d704e338f27171826c7f9a5adb90329e6f7b61b2472a6a5ae9a7
    binding_hash: 92e4439163e1d9a43ddbd1cf45214bf2dd574f21cf4ba456c72574b503e7b5f7
    fingerprint: ca5854984c4deafe650a03f63b2c0ad67a511d21c1692f0111a084830d6a40e7
    fingerprint_components:
      contract: b162859af005d704e338f27171826c7f9a5adb90329e6f7b61b2472a6a5ae9a7
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
      - symbol_id: SYM-proof-rationale-review-code
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
      test_id: TEST-proof-rationale-review-code
      pattern:
        symbol_id: SYM-schema6-check-actions-RATIONALE_REVIEW_CODE
        type: string
        value: review_requirement_rationale_missing
    certificate_digest: dd6f960e14b44cfe36f4d2b7c59bdc7f8a61c333b23c3b7a2f86fafce6ed80e0
    claim_bindings:
      - claim_key: CLAIM-0380F3C1816B850D
        requirement_id: REQ-kibi-lifecycle-check-codes
        fact_id: FACT-rationale-review-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review_requirement_rationale_missing
---
Proves that the missing rationale review code shall be review_requirement_rationale_missing, against the code Kibi reads at ingest.