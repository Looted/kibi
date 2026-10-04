---
title: kibi migrate brings a schema 5 KB to schema 6 with origin backfill and safe inventory re-derivation
status: passing
tags:
  - migration
  - schema-6
  - origin
  - semantic-inventory
  - cli
verification_scope: integration
verification_perspective: consumer
text_ref: packages/cli/tests/commands/migrate-schema6.test.ts; packages/cli/tests/operations/migration/origin-backfill.test.ts; packages/cli/tests/operations/migration/inventory-rederive.test.ts
origin:
  kind: agent
  recorded_at: '2026-10-04T02:24:51.903Z'
id: TEST-kibi-schema6-migration
type: test
---
# kibi migrate brings a schema 5 KB to schema 6 with origin backfill and safe inventory re-derivation

Runs `packages/cli/tests/commands/migrate-schema6.test.ts` against the built CLI (`kibi init` starts at schema 6; a schema 5 plan contains `entity_origin_backfill`, `semantic_inventory_rederive`, `semantic_inventory_review` with the `kibi model --input -` command and `review_exception_unapproved`, and the schema upgrade depends on the rewrites; applying the approved plan leaves sync and check passing and a second plan with nothing to migrate; `kibi migrate --yes` records the backfill in the audit; `kibi sync` lists every drifted requirement in one error that points at `kibi migrate`), plus `packages/cli/tests/operations/migration/origin-backfill.test.ts` (stamps only entities without origin, leaves every other byte unchanged, never overwrites, idempotent) and `packages/cli/tests/operations/migration/inventory-rederive.test.ts` (matching claims keep their grounding, reclassified claims become unresolved, a changed requirement is refused, a second run finds nothing).
