---
title: Consumer CLI commit after kibi migrate passes the pre-commit gates and still judges real edits
status: passing
priority: must
tags:
  - migration
  - staged
  - coordinates
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-14T08:46:36.785Z'
id: TEST-cli-migration-first-commit
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-migration-first-commit
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-cli-migration-first-commit
    target: default
    native_id: packages/cli/tests/commands/migrate-first-commit.test.ts::the first commit after kibi migrate::passes both pre-commit gates when the commit adds nothing else
    source_file: packages/cli/tests/commands/migrate-first-commit.test.ts
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-87a7d140368e49568302986d
    test_id: TEST-cli-migration-first-commit
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 5eda75c2f8fc058098b9e899240055e60d6ddf847784ca2498e5aac154a6cdf0
    binding_hash: 80c1369448cf6aa5acdef11835666587410e041e133e476bb2f96adbf15305e4
    fingerprint: d3c95c66be5fee6ba5a7edce1702e53a91d4f2400f10adfc2ae811439aae130b
    fingerprint_components:
      contract: 5eda75c2f8fc058098b9e899240055e60d6ddf847784ca2498e5aac154a6cdf0
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 7c2cde63165f4214f8cd46ce1f1face74173c4331f0626512e7da5b820a81670
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-cli-migration-first-commit
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Consumer test for REQ-cli-migration-first-commit (SCEN-cli-migration-first-commit). In a temporary Git repository with a committed legacy-layout KB (schema 4, knowledge under `documentation/`, one class-level symbol link that migrate marks legacy-link, no covering tests), it runs `kibi migrate --yes`, `kibi init` and `kibi sync`, stages everything and runs the two pre-commit gates through the CLI.

It asserts that migrate reports the coordinate refresh, that the derived coordinate cache stays untracked, that `kibi check-generated --staged --changed-only` reports no drift, and that `kibi check --staged` exits 0 with the Baseline line for the resolved renames and a Migration commit line naming the record migrate marked. Two further cases stage the same migration with one more change: a new uncovered symbol is reported under symbol-coverage, and an added implements link on the migrated symbol makes it judged again.

Unit tests in `packages/cli/tests/traceability/staged-migration.test.ts` and `packages/cli/tests/commands/migrate-legacy-links.test.ts` pin the field comparison, the migration-commit signal and the refresh on each migrate path (full run, run at the latest schema, planned legacy-link action).
