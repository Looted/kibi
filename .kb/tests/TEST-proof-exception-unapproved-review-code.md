---
title: The unapproved exception review code shall be review_exception_unapproved, by a regex proof
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
    - symbol_id: SYM-proof-exception-unapproved-review-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-EXCEPTION_UNAPPROVED_REVIEW_CODE
  proves:
    - CLAIM-21E64A855F1EB4A6
origin:
  kind: agent
  recorded_at: '2026-10-28T17:26:28.053Z'
id: TEST-proof-exception-unapproved-review-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f7203503654cbbee1186b0f1
    test_id: TEST-proof-exception-unapproved-review-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: be13ab2c92c782d4729bc0b04e7acc006bec0f1e4a65ca9066dc3df8434da9e5
    binding_hash: 702da0b0441a9aa97247b6e9fd01757a7eb2d6bb8fdc585f6705ec43fd774d2d
    fingerprint: f4e7f1ab68c0f4291500d2a2f64f75291d1d52d87e58642ba7b83dd9e7b5b611
    fingerprint_components:
      contract: be13ab2c92c782d4729bc0b04e7acc006bec0f1e4a65ca9066dc3df8434da9e5
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
      - symbol_id: SYM-proof-exception-unapproved-review-code
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
      test_id: TEST-proof-exception-unapproved-review-code
      pattern:
        symbol_id: SYM-schema6-check-actions-EXCEPTION_UNAPPROVED_REVIEW_CODE
        type: string
        value: review_exception_unapproved
    certificate_digest: b485986ef734bdde1c98206184e4da7e53e1c71dd86d6e26574a9b0a1410f181
    claim_bindings:
      - claim_key: CLAIM-21E64A855F1EB4A6
        requirement_id: REQ-kibi-lifecycle-review-codes
        fact_id: FACT-exception-unapproved-review-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review_exception_unapproved
---
Proves that the unapproved exception review code shall be review_exception_unapproved, against the code Kibi reads at ingest.