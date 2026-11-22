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
    receipt_id: PR-fb0835c0bcd3152a2a8d15c0
    test_id: TEST-cli-migrated-kb-type-backfill-sync-totals
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 34a14051cd42eeb9b9723a20400b2a9355d7c47368e6e22cec9e89fe4e13e439
    binding_hash: fe7c602717eb488ca71ddcb56b689ebccf8d5249dbc912acbfbf635ee859f7b6
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
