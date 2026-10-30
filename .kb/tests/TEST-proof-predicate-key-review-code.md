---
title: The predicate key arguments review code shall be review_predicate_key_arguments, by a regex proof
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
    - symbol_id: SYM-proof-predicate-key-review-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-PREDICATE_KEY_ARGUMENTS_REVIEW_CODE
  proves:
    - CLAIM-99283E7F3C085DEB
origin:
  kind: agent
  recorded_at: '2026-10-28T20:27:25.845Z'
id: TEST-proof-predicate-key-review-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-779b9ae4f79ceb35b03d3377
    test_id: TEST-proof-predicate-key-review-code
    scope: unit
    outcome: passed
    code_snapshot: 9afa255658d83e8294a2a4477e9a1c2905e91f21f6fd19f74373b92404007bd5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:29:02.426Z'
    finished_at: '2026-10-28T20:29:02.528Z'
    artifact_digest: 3e6d97a6b7b1194c9a72dc8a6455b134afbf886f54117e46a9f5d8179b9298cb
    contract_hash: ce8c18fa143c797d8792c351e381e73a2fd18d4c68b597b9b2a13a41a2edb452
    binding_hash: 044db0e25f2a938771f0bd03a02b7393f1563ab24f7fc14d465dfd89c1930639
    fingerprint: e38a3b30ca26b800b208843593c778f6d8be5caff80e69c7b0bd69f4c89b284d
    fingerprint_components:
      contract: ce8c18fa143c797d8792c351e381e73a2fd18d4c68b597b9b2a13a41a2edb452
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
      - symbol_id: SYM-proof-predicate-key-review-code
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
      test_id: TEST-proof-predicate-key-review-code
      pattern:
        symbol_id: SYM-schema6-check-actions-PREDICATE_KEY_ARGUMENTS_REVIEW_CODE
        type: string
        value: review_predicate_key_arguments
    certificate_digest: 113e83da91b36e9435dc59e6f61c2680479e24eee1a25a9dc287d7205414399c
    claim_bindings:
      - claim_key: CLAIM-99283E7F3C085DEB
        requirement_id: REQ-kibi-lifecycle-review-actions
        fact_id: FACT-predicate-key-review-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review_predicate_key_arguments
---
Proves that the predicate key arguments review code shall be review_predicate_key_arguments, against the code Kibi reads at ingest.