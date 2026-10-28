---
title: Consumer CLI migrates a schema 5 KB to schema 6 with migration origins and intact grounding, and a rerun finds nothing to do
status: passing
priority: must
tags:
  - migration
  - schema-6
  - origin
  - semantic-inventory
  - cli
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-schema6-migration-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-schema6-migration-cli
    target: default
    native_id: packages/cli/tests/consumer/schema6-migration.test.ts::schema 6 migration through the kibi CLI::a schema 5 KB migrates to schema 6 with migration origins and its grounding intact, and a rerun finds nothing to do
    source_file: packages/cli/tests/consumer/schema6-migration.test.ts
    line: 81
origin:
  kind: agent
  recorded_at: '2026-10-04T04:43:42.022Z'
id: TEST-kibi-schema6-migration-cli
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-45818e0d3d844392f7e6bbf4
    test_id: TEST-kibi-schema6-migration-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 48cc5f2c6340fb17a7d99816b8c9a340c61bcad65b834285c14663cdc1f2d7fa
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:25:47.458Z'
    finished_at: '2026-10-28T19:25:56.783Z'
    artifact_digest: 9f03d74bdd18d26ae1e45c21d6354191e03a70a78dbdf83387343ddb2d0b218d
    contract_hash: 1464e544a41a630f7dde00234698cde9868be42c88307c19f659fa71f7dcc949
    binding_hash: d037ef5ba704f378a8a5f8951fa063d36b23b6517e5d75ab3c92000f34253496
    fingerprint: de05406f44527a4bdc93a764771f383149a3b7a32a5ca9a27d9f3173395f730c
    fingerprint_components:
      contract: 1464e544a41a630f7dde00234698cde9868be42c88307c19f659fa71f7dcc949
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: d0ada57487ac5189e3f38c3795fef40c5f6ddedba9c1bf9a51ae89ecf2c8cbe6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-schema6-migration-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# Consumer CLI migrates a schema 5 KB to schema 6 with migration origins and intact grounding, and a rerun finds nothing to do

Drives a schema 5 workspace through the built `kibi` binary (`packages/cli/tests/consumer/schema6-migration.test.ts`).

- `kibi migrate --dry-run --format json` plans the origin backfill, the semantic inventory re-derivation and the schema upgrade, and writes nothing.
- `kibi migrate --apply-safe` with the approved plan hash applies them; its stdout is the JSON result alone.
- Every migrated entity carries `origin.kind: migration`, the drifted ledger is re-derived while the requirement keeps its logic claims and fact links, `kibi status` is fresh on schema 6 and `kibi check` reports no violations.
- A second `kibi migrate` reports that no migration is needed and changes no file.
