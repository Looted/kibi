---
title: 'CLI on an already migrated KB: the next kibi migrate adds the missing type line, and kibi sync reports KB totals'
status: passing
priority: must
tags:
  - cli
  - migration
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-migrate-entity-type
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-cli-migrate-entity-type
    target: default
    native_id: packages/cli/tests/commands/migrate-entity-type.test.ts::legacy entity files without a type line::a KB migrated without the type line gets it from the next kibi migrate, and sync reports KB totals beside what it imported
    source_file: packages/cli/tests/commands/migrate-entity-type.test.ts
    line: 154
origin:
  kind: agent
  recorded_at: '2026-10-14T21:06:42.860Z'
id: TEST-cli-migrated-kb-type-backfill-sync-totals
type: test
---
Runs the CLI against a KB at the latest schema with a requirement file that has no `type`. It asserts that `kibi migrate` plans `entity-type-backfill`, that `kibi migrate --yes` adds only the `type` line and a second run is a no-op, and that `kibi sync` after an upsert prints the KB totals beside the counts imported from changed sources.
