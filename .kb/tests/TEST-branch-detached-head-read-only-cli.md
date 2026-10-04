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
---
# Consumer CLI answers reads on a detached HEAD from a read-only snapshot and refuses writes with an error envelope

Drives a workspace through the built `kibi` binary on a commit no local branch points at (`packages/cli/tests/consumer/detached-head.test.ts`).

- `kibi query`, `kibi search` and `kibi status` answer from a read-only snapshot compiled from the checkout's tracked sources, and each answer carries the `detached_head_read_only` notice with the commit and the branches at HEAD.
- `kibi upsert` is refused before anything is written: stdout is an `OPERATION_FAILED` error envelope whose message names `git switch -c <branch>` and `KIBI_BRANCH`, and the scenario file is not created.
- Back on `main`, the branch KB was neither guessed for the detached checkout nor written while it was attached.
