---
title: The entity type backfill code shall be entity_type_backfill, by a regex proof
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
    - symbol_id: SYM-proof-entity-type-backfill-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-entity-type-backfill-code
  proves:
    - CLAIM-1A3FD18EB41F242A
origin:
  kind: agent
  recorded_at: '2026-10-28T17:43:37.198Z'
id: TEST-proof-entity-type-backfill-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-92a8475990f2e89d0e0a2a0a
    test_id: TEST-proof-entity-type-backfill-code
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: c1481e39210fc95132b65c95b28a841f8c6f759e291d28a21102c0f2b9a67cdb
    binding_hash: 30ff6c0840966b715802cba21025458a732c8e61d548bffb16a38b2682e6b6b2
    fingerprint: 826d0f2995a3370475d7f1be23d7f26c1fd286bec0d1a6621413f69eafe04437
    fingerprint_components:
      contract: c1481e39210fc95132b65c95b28a841f8c6f759e291d28a21102c0f2b9a67cdb
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
      - symbol_id: SYM-proof-entity-type-backfill-code
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
      test_id: TEST-proof-entity-type-backfill-code
      pattern:
        symbol_id: SYM-migration-entity-type-backfill-code
        type: string
        value: entity_type_backfill
    certificate_digest: fd3619269f3128fd6a1f71d08b84c7ce65175958b35a9ba4084bf25f5e7df11d
    claim_bindings:
      - claim_key: CLAIM-1A3FD18EB41F242A
        requirement_id: REQ-cli-migration-action-codes
        fact_id: FACT-entity-type-backfill-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: entity_type_backfill
---
Proves that the entity type backfill code shall be entity_type_backfill, against the code Kibi reads at ingest.