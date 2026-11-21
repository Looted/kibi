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
    receipt_id: PR-742b61aced8c4c87282253d8
    test_id: TEST-proof-search-answer-governing
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 198a788ed6a19169d14378c820d5be011349a6662014da06ee78ff76f0a5284d
    binding_hash: 1471d57a3ae840b1ea2b8971c71b87a2063b7fb67e64ae358568f2aa55319c20
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