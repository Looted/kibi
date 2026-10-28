---
title: The superseded symbol owner review action id shall be review-symbol-owner-superseded, by a regex proof
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
    - symbol_id: SYM-proof-symbol-owner-review-action
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-SYMBOL_OWNER_REVIEW_ACTION_ID
  proves:
    - CLAIM-525C794415A21798
origin:
  kind: agent
  recorded_at: '2026-10-28T17:29:32.937Z'
id: TEST-proof-symbol-owner-review-action
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-56dc378e9f4bc2dc74bac9f9
    test_id: TEST-proof-symbol-owner-review-action
    scope: unit
    outcome: passed
    code_snapshot: 4b699c9b07afd709892fdd2513cb5f73a7167d1881b1a2daf6c70078e8f98147
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:31:26.138Z'
    finished_at: '2026-10-28T17:31:26.267Z'
    artifact_digest: 70e0d8eadc3ba45c9fa8b110f6844a6f5b87f73c090e5312465e428610957fcb
    contract_hash: 6260a7d07c2569f1a6e72182db3760a504cf1b54fe1cea9186c0b2b77a9c0ab1
    binding_hash: 8f0f0f28b25a792cfc1d14a069bd3a8dc1aa6b1caf28906e9e7a952cc8aa0be5
    fingerprint: 0b118b347f7b0ad22a596dabe5e8391543ae3c8ed052fa3bede813abf3a605ad
    fingerprint_components:
      contract: 6260a7d07c2569f1a6e72182db3760a504cf1b54fe1cea9186c0b2b77a9c0ab1
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
      - symbol_id: SYM-proof-symbol-owner-review-action
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
      test_id: TEST-proof-symbol-owner-review-action
      pattern:
        symbol_id: SYM-schema6-check-actions-SYMBOL_OWNER_REVIEW_ACTION_ID
        type: string
        value: review-symbol-owner-superseded
    certificate_digest: 11fd25bc275c0ec15d56c5bd1458c7acdded36662aecd037031456dcf50c2252
    claim_bindings:
      - claim_key: CLAIM-525C794415A21798
        requirement_id: REQ-kibi-lifecycle-check-codes
        fact_id: FACT-symbol-owner-review-action
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review-symbol-owner-superseded
---
Proves that the superseded symbol owner review action id shall be review-symbol-owner-superseded, against the code Kibi reads at ingest.