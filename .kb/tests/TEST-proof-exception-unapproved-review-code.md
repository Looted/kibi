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
    receipt_id: PR-13d5e34399a5b42b4ef44420
    test_id: TEST-proof-exception-unapproved-review-code
    scope: unit
    outcome: passed
    code_snapshot: 4b699c9b07afd709892fdd2513cb5f73a7167d1881b1a2daf6c70078e8f98147
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:30:32.574Z'
    finished_at: '2026-10-28T17:30:32.781Z'
    artifact_digest: 39c94eab4852bc3b8f4ba59b1bc862051d0db096d0305a11e27db57c667db053
    contract_hash: be13ab2c92c782d4729bc0b04e7acc006bec0f1e4a65ca9066dc3df8434da9e5
    binding_hash: 5c2cfdddb649a5534c459e668cf3aef755a97cffbd11d04ce79bdfed86fa5351
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
        requirement_id: REQ-kibi-lifecycle-check-codes
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