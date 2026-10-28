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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bc53014b6a114e89025e4e87
    test_id: TEST-branch-detached-head-read-only-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 6c1d4b48c8c790bbc509e46899ccd457757c7db5641cef07df4b567f347481bf
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:44:40.777Z'
    finished_at: '2026-10-28T20:44:51.151Z'
    artifact_digest: c30a2f3ea2ddb061f984d7ab0c47c1c70df73e93ee63542bc08fe973c1d02da9
    contract_hash: 492f39c53ff2cd18ee0935119b8a94c267bc336619a913b2d1c0a23c4c3c814c
    binding_hash: 5253d95d77b08470b266fa7540c7eb9c62381065382c03dda7a85d10e4f03eb8
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
    kind: e2e
    evidence_level: tested
---
# Consumer CLI answers reads on a detached HEAD from a read-only snapshot and refuses writes with an error envelope

Drives a workspace through the built `kibi` binary on a commit no local branch points at (`packages/cli/tests/consumer/detached-head.test.ts`).

- `kibi query`, `kibi search` and `kibi status` answer from a read-only snapshot compiled from the checkout's tracked sources, and each answer carries the `detached_head_read_only` notice with the commit and the branches at HEAD.
- `kibi upsert` is refused before anything is written: stdout is an `OPERATION_FAILED` error envelope whose message names `git switch -c <branch>` and `KIBI_BRANCH`, and the scenario file is not created.
- Back on `main`, the branch KB was neither guessed for the detached checkout nor written while it was attached.
