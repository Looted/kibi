---
title: 'CLI on a legacy KB: doctor and kb_status name kibi migrate --yes first, and a status-only upsert after migrate changes only the status line'
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
    native_id: 'packages/cli/tests/commands/migrate-entity-type.test.ts::legacy entity files without a type line::a legacy KB: doctor and kb_status both name kibi migrate --yes first, migrate states the type, and a status-only upsert changes only the status line'
    source_file: packages/cli/tests/commands/migrate-entity-type.test.ts
    line: 88
origin:
  kind: agent
  recorded_at: '2026-10-14T21:06:41.235Z'
id: TEST-cli-legacy-kb-first-migrate
type: test
---
Runs the CLI against a legacy KB (`.kb/config.json`, requirement files without `type`). It asserts that `kibi doctor` and `kb_status.bootstrap.nextAction` both name `kibi migrate --yes`, that migrate adds `type: req`, and that after a commit and sync a status-only `kb_upsert` changes exactly the `status` line in the Git diff.
