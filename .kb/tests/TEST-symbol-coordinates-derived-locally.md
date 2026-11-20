---
title: Consumer CLI derives symbol coordinates locally and keeps them out of commits
status: passing
priority: must
tags:
  - symbols
  - coordinates
  - staged
  - migration
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-27T00:00:00.000Z'
id: TEST-symbol-coordinates-derived-locally
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-derived-coordinates-parallel-merge
      target: default
    - symbol_id: SYM-test-derived-coordinates-staged-titles
      target: default
    - symbol_id: SYM-test-derived-coordinates-reject-staged-cache
      target: default
    - symbol_id: SYM-test-derived-coordinates-migrate-untracks
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-derived-coordinates-parallel-merge
    target: default
    native_id: packages/cli/tests/commands/derived-symbol-coordinates.test.ts::symbol coordinates are a local cache derived from source::parallel edits to one source file merge cleanly and sync rebuilds the cache
    source_file: packages/cli/tests/commands/derived-symbol-coordinates.test.ts
  - symbol_id: SYM-test-derived-coordinates-staged-titles
    target: default
    native_id: packages/cli/tests/commands/derived-symbol-coordinates.test.ts::symbol coordinates are a local cache derived from source::the staged gate names the declarations the authored manifest does not cover
    source_file: packages/cli/tests/commands/derived-symbol-coordinates.test.ts
  - symbol_id: SYM-test-derived-coordinates-reject-staged-cache
    target: default
    native_id: packages/cli/tests/commands/derived-symbol-coordinates.test.ts::symbol coordinates are a local cache derived from source::check-generated rejects a commit that stages the coordinate cache
    source_file: packages/cli/tests/commands/derived-symbol-coordinates.test.ts
  - symbol_id: SYM-test-derived-coordinates-migrate-untracks
    target: default
    native_id: packages/cli/tests/commands/derived-symbol-coordinates.test.ts::symbol coordinates are a local cache derived from source::kibi migrate untracks a coordinate artifact an older schema committed
    source_file: packages/cli/tests/commands/derived-symbol-coordinates.test.ts
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b5c9f8d9b8fdc8a65a7dd9b2
    test_id: TEST-symbol-coordinates-derived-locally
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: b0d771d7d0ab2645cd49dbd338a3d2f14f2630358551cee88869849902c2f169
    binding_hash: 916270756d9eb727cdff6d1588380b72c593c2e5b585291cc3b7a5c8f6c78864
    fingerprint: 0e42f0bb02b3b334b7c3551099edb2f4d3010a263345b419726ac5f47cabdf52
    fingerprint_components:
      contract: b0d771d7d0ab2645cd49dbd338a3d2f14f2630358551cee88869849902c2f169
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 418e3b286818ab14a755c9cf5ec11ec4f395e84ab663e16ad23a8cd55a073c7b
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-derived-coordinates-parallel-merge
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-derived-coordinates-staged-titles
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-derived-coordinates-reject-staged-cache
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-derived-coordinates-migrate-untracks
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Consumer test for REQ-symbol-coordinates-derived-locally (SCEN-symbol-coordinates-derived-locally) in `packages/cli/tests/commands/derived-symbol-coordinates.test.ts`. Each case builds a temporary Git repository with `kibi init`, one source file with two functions and an authored `.kb/symbols.yaml`, and drives the CLI.

It asserts that init gitignores the cache and leaves it untracked; that two branches editing the same file merge cleanly and `kibi sync` reports the moved lines while `.kb/symbols.yaml` stays byte-identical; that a later move passes `kibi check-generated --staged --changed-only` and `kibi check --staged` with only the source staged; that a renamed declaration fails the staged check with the uncovered and stale titles named; that a force-staged cache fails `check-generated` without changing the index; and that `kibi migrate` from schema 12 untracks a committed cache, keeps the local file, adds the gitignore line and passes `check-generated` afterwards.