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
    receipt_id: PR-5e47f829a88f9105703e24b4
    test_id: TEST-cli-migration-first-commit
    scope: end_to_end
    outcome: passed
    code_snapshot: faf065f2781c1044c030ed22ef2de1f9fa5ba7e2c43b903b7407837a816cfb65
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:43:49.109Z'
    finished_at: '2026-10-29T10:44:09.809Z'
    artifact_digest: dd8cd9701fd678bf2c076fe3250d0ca23702e7534d5a29740b14becda106cc1f
    contract_hash: 5eda75c2f8fc058098b9e899240055e60d6ddf847784ca2498e5aac154a6cdf0
    binding_hash: f5480b5d4fe50ef9ec3edf9e2cf7d641a4d9c25175400bec4d900b179d0f6095
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
