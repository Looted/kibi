---
title: A search answer shall list at most 5 governing requirements, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-search-answer-governing
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-search-answer-limits
      export: SEARCH_ANSWER_LIMITS.governing
  proves:
    - CLAIM-63645A08C98064C3
origin:
  kind: agent
  recorded_at: '2026-10-28T11:11:13.411Z'
id: TEST-proof-search-answer-governing
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c55362a19b4d348790694ce5
    test_id: TEST-proof-search-answer-governing
    scope: unit
    outcome: passed
    code_snapshot: 98c9548fc40fd9d92b46f3a96e28309ed72f08183f2027ffa1ec112951c0d07b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:12:50.798Z'
    finished_at: '2026-10-28T11:12:50.902Z'
    artifact_digest: e6de3ad2df28ddea56cba32c49165d981ef3bde3b55a67bda9b5bce5e5c91a14
    contract_hash: 198a788ed6a19169d14378c820d5be011349a6662014da06ee78ff76f0a5284d
    binding_hash: 2782bc476b8bbbdf329fb270b0caca421123d2734ee9c01e2a917f29f412e24c
    fingerprint: 2bfd12c64b8024608b39df5fa47448ca03b9a2f8fd7a9ab48827b503e762ba7d
    fingerprint_components:
      contract: 198a788ed6a19169d14378c820d5be011349a6662014da06ee78ff76f0a5284d
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
      - symbol_id: SYM-proof-search-answer-governing
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-search-answer-governing
      variable: governing
      value_type: int
      assumptions:
        - operator: eq
          value: 5
      claim:
        operator: eq
        value: 5
    certificate_digest: 8011ab0a2287abe82496424e1172172311e62f66ebe0b8e2aab51be0fbdaab0f
    claim_bindings:
      - claim_key: CLAIM-63645A08C98064C3
        requirement_id: REQ-kibi-search-answer-limits
        fact_id: FACT-search-answer-governing
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 5
          value_type: int
          variable: governing
---
Proves that a search answer shall list at most 5 governing requirements, against the code Kibi reads at ingest.