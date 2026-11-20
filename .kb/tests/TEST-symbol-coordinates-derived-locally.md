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
    receipt_id: PR-5c98e45991d5c1f8b99328f7
    test_id: TEST-symbol-coordinates-derived-locally
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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