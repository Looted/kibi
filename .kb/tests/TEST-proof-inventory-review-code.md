---
title: The semantic inventory review code shall be semantic_inventory_review, by a regex proof
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
    - symbol_id: SYM-proof-inventory-review-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-semantic-inventory-review-code
  proves:
    - CLAIM-50D83AC3336F278B
origin:
  kind: agent
  recorded_at: '2026-10-28T18:50:48.856Z'
id: TEST-proof-inventory-review-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-553dc755ff6a5245938dc2a2
    test_id: TEST-proof-inventory-review-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 65b910f2e3e350e6dddfa2fe187999f6f276146fed8cd7e27f79a3671a03be31
    binding_hash: 7aacddb3955b4a1b4d2b070ec409ec9ce2350a8f7d194dcb822d25e76cc4eb51
    fingerprint: ca1294474e6117bd0bfd02e829f19ba1f4d5a582f6cd8920b6984db43f866b5b
    fingerprint_components:
      contract: 65b910f2e3e350e6dddfa2fe187999f6f276146fed8cd7e27f79a3671a03be31
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
      - symbol_id: SYM-proof-inventory-review-code
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
      test_id: TEST-proof-inventory-review-code
      pattern:
        symbol_id: SYM-migration-semantic-inventory-review-code
        type: string
        value: semantic_inventory_review
    certificate_digest: 7ae73ce659e6a0a74476e68d2a7ddac3e60e8c0ffbaad7f9d1ad1f927562aaae
    claim_bindings:
      - claim_key: CLAIM-50D83AC3336F278B
        requirement_id: REQ-cli-schema-migration-codes
        fact_id: FACT-inventory-review-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: semantic_inventory_review
---
Proves that the semantic inventory review code shall be semantic_inventory_review, against the code Kibi reads at ingest.