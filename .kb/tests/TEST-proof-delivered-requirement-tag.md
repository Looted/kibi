---
title: A migrated delivered requirement shall carry the tag implemented, by a regex proof
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
    - symbol_id: SYM-proof-delivered-requirement-tag
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-delivered-requirement-tag
  proves:
    - CLAIM-8892563ACF42D3F6
origin:
  kind: agent
  recorded_at: '2026-10-28T17:42:13.500Z'
id: TEST-proof-delivered-requirement-tag
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-669cc4a1bffb8fea394ac0d6
    test_id: TEST-proof-delivered-requirement-tag
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: aa112eea396d3e7d343d44a037ccc1daa8fd586cc8cc7ce16d707dc8253b041b
    binding_hash: 1e5654b3d172b4544e62619888268669ec6b100125ad691acb4db0c3e4f48e14
    fingerprint: 9dfa772e40371c5865961b2d794a47d65cb8602e5ddb5c532524e89f86db5240
    fingerprint_components:
      contract: aa112eea396d3e7d343d44a037ccc1daa8fd586cc8cc7ce16d707dc8253b041b
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
      - symbol_id: SYM-proof-delivered-requirement-tag
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
      test_id: TEST-proof-delivered-requirement-tag
      pattern:
        symbol_id: SYM-migration-delivered-requirement-tag
        type: string
        value: implemented
    certificate_digest: b3ab3957665ca71e48d7a3dc3ca137ad90572984e94e90c9c6b5584678643c91
    claim_bindings:
      - claim_key: CLAIM-8892563ACF42D3F6
        requirement_id: REQ-cli-migration-action-codes
        fact_id: FACT-delivered-requirement-tag
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: implemented
---
Proves that a migrated delivered requirement shall carry the tag implemented, against the code Kibi reads at ingest.