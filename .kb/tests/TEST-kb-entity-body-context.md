---
title: Entity body context check, migration and authoring tests
status: passing
priority: must
tags:
  - kb
  - bodies
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-06T18:33:10.491Z'
id: TEST-kb-entity-body-context
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kb-entity-body-context
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-fa80aa55bfb5c25394bd4275
    test_id: TEST-kb-entity-body-context
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 3ad1f6c693f66d2149012802ac5da4cc2ab8bb344185670f67410ce2c14fcb7c
    binding_hash: 9eac7e884dbb172d9704984135c905d9bd2ddac55ce0b0400a29c887a22ebb17
    fingerprint: 41d6bcf1adc210f4359941183fa1e78eb082ea42d894d292eb172c00dc024721
    fingerprint_components:
      contract: 3ad1f6c693f66d2149012802ac5da4cc2ab8bb344185670f67410ce2c14fcb7c
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
      - symbol_id: SYM-test-kb-entity-body-context
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Asserts the body section model, the `entity-context-missing` and `entity-context-acknowledged` rules through `kibi check` on fixture workspaces, the upsert warning, compile-intent and bootstrap body rendering, and the schema 8 migration, using temporary workspaces and the real check executor in packages/cli/tests (entity-body-context, check-entity-context, context-warning, entity-context, body-preservation and migration tests).

A false pass would be a fixture whose context is padded with filler that still clears the 12-word floor, or a migration test that compares only front matter; the body-preservation test therefore compares full body bytes of multi-section bodies after the schema 6, 7 and 8 actions.
