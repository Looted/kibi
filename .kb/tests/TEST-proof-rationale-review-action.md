---
title: The missing rationale review action id shall be review-requirement-rationale-missing, by a regex proof
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
    - symbol_id: SYM-proof-rationale-review-action
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-RATIONALE_REVIEW_ACTION_ID
  proves:
    - CLAIM-D64C8177148774A7
origin:
  kind: agent
  recorded_at: '2026-10-28T20:27:46.312Z'
id: TEST-proof-rationale-review-action
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a572dc8b37acc7beffdc7dc8
    test_id: TEST-proof-rationale-review-action
    scope: unit
    outcome: passed
    code_snapshot: 9afa255658d83e8294a2a4477e9a1c2905e91f21f6fd19f74373b92404007bd5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:29:08.310Z'
    finished_at: '2026-10-28T20:29:08.412Z'
    artifact_digest: 97feb39941900ded93290c68d628c291712e618518f1258631bf0d4162615a2d
    contract_hash: 0c5e3a957b08ee81e50802534f840f0ec6964f86e64b291fe702bfdccb2c3807
    binding_hash: 0d0f026f2c227944c054c0c6359a1da047cbe7565d2aa3c0d11e974b0a64cfb6
    fingerprint: c201e7ad54ef5693a913aa9a515054ca8f235a4da0f660c7c6c09bc01d0c3db1
    fingerprint_components:
      contract: 0c5e3a957b08ee81e50802534f840f0ec6964f86e64b291fe702bfdccb2c3807
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
      - symbol_id: SYM-proof-rationale-review-action
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
      test_id: TEST-proof-rationale-review-action
      pattern:
        symbol_id: SYM-schema6-check-actions-RATIONALE_REVIEW_ACTION_ID
        type: string
        value: review-requirement-rationale-missing
    certificate_digest: 25cf98638ed96775578a5d50190732b07f25f6ef716b92e3cb6c7e036667e642
    claim_bindings:
      - claim_key: CLAIM-D64C8177148774A7
        requirement_id: REQ-kibi-lifecycle-review-actions
        fact_id: FACT-rationale-review-action
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review-requirement-rationale-missing
---
Proves that the missing rationale review action id shall be review-requirement-rationale-missing, against the code Kibi reads at ingest.