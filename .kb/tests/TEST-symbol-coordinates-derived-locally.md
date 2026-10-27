---
title: Consumer CLI derives symbol coordinates locally and keeps them out of commits
status: active
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
    receipt_id: PR-b626cf2c8a712ee661dfc09d
    test_id: TEST-symbol-coordinates-derived-locally
    scope: end_to_end
    outcome: passed
    code_snapshot: d2d67df7f0b4374f0d1b0e824577993a5c68f5934b83d18ce23258a4b82208ef
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T11:10:10.253Z'
    finished_at: '2026-10-27T11:10:22.966Z'
    artifact_digest: ab60d3cc1ca7add3dc53811588f64337e4f7ee71a55ca946d6dc9c321a264072
    contract_hash: b0d771d7d0ab2645cd49dbd338a3d2f14f2630358551cee88869849902c2f169
    binding_hash: 109289cfee9c5bb179389938467d5cd5ac19a338efb888761eaa205c4f9fd53c
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