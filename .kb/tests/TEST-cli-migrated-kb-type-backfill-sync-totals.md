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
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c5bb489ffda114416c7dff35
    test_id: TEST-cli-migrated-kb-type-backfill-sync-totals
    scope: end_to_end
    outcome: passed
    code_snapshot: 43675d5112431d4f3e5766d7fd142174b14e417e9c8b3d76bc67f23dfa7c508e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-24T20:09:56.914Z'
    finished_at: '2026-10-24T20:10:04.889Z'
    artifact_digest: 741b4a8c2f552e90f2179ea8198d09f9d6c47b1cef67087b982d284b3f41bb72
    contract_hash: 34a14051cd42eeb9b9723a20400b2a9355d7c47368e6e22cec9e89fe4e13e439
    binding_hash: ee3ebd4f63d4434178d0ebe499350f6ca23bf36069bf0d4dd9aa3b56d289da98
    fingerprint: 74c0cd0ddf3991c7011b5b5c8f7e52888b286b4bb638191c9ec8033fd053d0db
    fingerprint_components:
      contract: 34a14051cd42eeb9b9723a20400b2a9355d7c47368e6e22cec9e89fe4e13e439
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 8d37c58c0477398d048ea8001fd0033da8d1ab2d64b4012c2de36795919bfef0
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-cli-migrate-entity-type
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the CLI against a KB at the latest schema with a requirement file that has no `type`. It asserts that `kibi migrate` plans `entity-type-backfill`, that `kibi migrate --yes` adds only the `type` line and a second run is a no-op, and that `kibi sync` after an upsert prints the KB totals beside the counts imported from changed sources.
