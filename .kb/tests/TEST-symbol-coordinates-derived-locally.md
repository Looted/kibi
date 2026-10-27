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
---
Consumer test for REQ-symbol-coordinates-derived-locally (SCEN-symbol-coordinates-derived-locally) in `packages/cli/tests/commands/derived-symbol-coordinates.test.ts`. Each case builds a temporary Git repository with `kibi init`, one source file with two functions and an authored `.kb/symbols.yaml`, and drives the CLI.

It asserts that init gitignores the cache and leaves it untracked; that two branches editing the same file merge cleanly and `kibi sync` reports the moved lines while `.kb/symbols.yaml` stays byte-identical; that a later move passes `kibi check-generated --staged --changed-only` and `kibi check --staged` with only the source staged; that a renamed declaration fails the staged check with the uncovered and stale titles named; that a force-staged cache fails `check-generated` without changing the index; and that `kibi migrate` from schema 12 untracks a committed cache, keeps the local file, adds the gitignore line and passes `check-generated` afterwards.