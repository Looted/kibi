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
    receipt_id: PR-89f935f7c619786850f2f398
    test_id: TEST-proof-inventory-review-code
    scope: unit
    outcome: passed
    code_snapshot: dc0be4d5803f22ca38ce1004b6769d2368029ae49edea82620e6c6618cbf4d3a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T18:53:06.730Z'
    finished_at: '2026-10-28T18:53:06.923Z'
    artifact_digest: 2f263478921ced3a146af7daf79911a65afa1e77caafcbaee8c16330ef2330a8
    contract_hash: 65b910f2e3e350e6dddfa2fe187999f6f276146fed8cd7e27f79a3671a03be31
    binding_hash: 67beee009ac101195ec22229a63306581c9b00aec5254388c7d33d56602cde32
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