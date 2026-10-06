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
---
Asserts the body section model, the `entity-context-missing` and `entity-context-acknowledged` rules through `kibi check` on fixture workspaces, the upsert warning, compile-intent and bootstrap body rendering, and the schema 8 migration, using temporary workspaces and the real check executor in packages/cli/tests (entity-body-context, check-entity-context, context-warning, entity-context, body-preservation and migration tests).

A false pass would be a fixture whose context is padded with filler that still clears the 12-word floor, or a migration test that compares only front matter; the body-preservation test therefore compares full body bytes of multi-section bodies after the schema 6, 7 and 8 actions.
