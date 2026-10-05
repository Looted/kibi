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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-11fe0266f4f15d8ebf9edc85
    test_id: TEST-kibi-schema6-migration-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 1464e544a41a630f7dde00234698cde9868be42c88307c19f659fa71f7dcc949
    binding_hash: 800f80975e5cb24451de1187fce3838ae35eef43d80f1363a8184a4a48fb172b
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
---
# Consumer CLI migrates a schema 5 KB to schema 6 with migration origins and intact grounding, and a rerun finds nothing to do

Drives a schema 5 workspace through the built `kibi` binary (`packages/cli/tests/consumer/schema6-migration.test.ts`).

- `kibi migrate --dry-run --format json` plans the origin backfill, the semantic inventory re-derivation and the schema upgrade, and writes nothing.
- `kibi migrate --apply-safe` with the approved plan hash applies them; its stdout is the JSON result alone.
- Every migrated entity carries `origin.kind: migration`, the drifted ledger is re-derived while the requirement keeps its logic claims and fact links, `kibi status` is fresh on schema 6 and `kibi check` reports no violations.
- A second `kibi migrate` reports that no migration is needed and changes no file.
