---
title: Entity body context check, migration and authoring tests
status: active
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-2cbf03c522b5cdfe06cf60bd
    test_id: TEST-kb-entity-body-context
    scope: end_to_end
    outcome: passed
    code_snapshot: 2833bd366b3cfcb08d7302f25ef9d4e8cff83fb16d0587c0516f6756b438620e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-06T19:41:26.576Z'
    finished_at: '2026-10-06T19:41:30.481Z'
    artifact_digest: 992b5fb389fa35dfe5ccf58e6f5a58cea1a29beeb5150bc7e793f6a8b9ca5d45
    contract_hash: 3ad1f6c693f66d2149012802ac5da4cc2ab8bb344185670f67410ce2c14fcb7c
    binding_hash: 3b5b1f034694da0209a4493d2656b3c1cac116495ca60269c023dbdf8ebe7373
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
---
Asserts the body section model, the `entity-context-missing` and `entity-context-acknowledged` rules through `kibi check` on fixture workspaces, the upsert warning, compile-intent and bootstrap body rendering, and the schema 8 migration, using temporary workspaces and the real check executor in packages/cli/tests (entity-body-context, check-entity-context, context-warning, entity-context, body-preservation and migration tests).

A false pass would be a fixture whose context is padded with filler that still clears the 12-word floor, or a migration test that compares only front matter; the body-preservation test therefore compares full body bytes of multi-section bodies after the schema 6, 7 and 8 actions.
