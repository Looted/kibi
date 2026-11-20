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
    receipt_id: PR-d12160675bdae36f4be61f0c
    test_id: TEST-proof-rationale-review-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: b162859af005d704e338f27171826c7f9a5adb90329e6f7b61b2472a6a5ae9a7
    binding_hash: 915c0f91991e5ec8a221b2b7d603d3c5ba6103d52edcbbbd44d55b2e612971c1
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
        requirement_id: REQ-kibi-lifecycle-review-codes
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