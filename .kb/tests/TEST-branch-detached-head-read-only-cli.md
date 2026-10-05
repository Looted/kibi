---
title: Consumer CLI answers reads on a detached HEAD from a read-only snapshot and refuses writes with an error envelope
status: passing
priority: must
tags:
  - branch
  - detached-head
  - read-only
  - snapshot
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-branch-detached-head-read-only-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-branch-detached-head-read-only-cli
    target: default
    native_id: packages/cli/tests/consumer/detached-head.test.ts::detached HEAD checkouts through the kibi CLI::answer query, search and status from a read-only snapshot of the checkout and refuse upsert
    source_file: packages/cli/tests/consumer/detached-head.test.ts
    line: 76
origin:
  kind: agent
  recorded_at: '2026-10-04T05:28:35.893Z'
id: TEST-branch-detached-head-read-only-cli
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9ffb2cb73b88399aa8869a62
    test_id: TEST-branch-detached-head-read-only-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 492f39c53ff2cd18ee0935119b8a94c267bc336619a913b2d1c0a23c4c3c814c
    binding_hash: 468891006ff3b48e802c400053d514831b0bc26657ead60c744da62f49a0ac43
    fingerprint: 1b3d09f844fc4e885b36530e2efe7f195a371991fbe853158b7b0dea9b2caf3d
    fingerprint_components:
      contract: 492f39c53ff2cd18ee0935119b8a94c267bc336619a913b2d1c0a23c4c3c814c
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 1f36c0a23350ba9ac98ff05e2ba4fb2c72cef15d830815683a7ce78036282743
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-branch-detached-head-read-only-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
# Consumer CLI answers reads on a detached HEAD from a read-only snapshot and refuses writes with an error envelope

Drives a workspace through the built `kibi` binary on a commit no local branch points at (`packages/cli/tests/consumer/detached-head.test.ts`).

- `kibi query`, `kibi search` and `kibi status` answer from a read-only snapshot compiled from the checkout's tracked sources, and each answer carries the `detached_head_read_only` notice with the commit and the branches at HEAD.
- `kibi upsert` is refused before anything is written: stdout is an `OPERATION_FAILED` error envelope whose message names `git switch -c <branch>` and `KIBI_BRANCH`, and the scenario file is not created.
- Back on `main`, the branch KB was neither guessed for the detached checkout nor written while it was attached.
