---
title: Unreadable-repository refusal tests
status: active
priority: must
tags:
  - vcs
  - branching
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:16:49.284Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-workspace-vcs
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-no-git-unreadable-repository
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f39b16c8199be024a19df3d2
    test_id: TEST-kibi-no-git-unreadable-repository
    scope: end_to_end
    outcome: passed
    code_snapshot: ab010f37efcf08fa96a686fb375f97e60fdc390a3cd0d543a237c0bfef7a8124
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-25T11:42:03.633Z'
    finished_at: '2026-11-25T11:42:20.470Z'
    artifact_digest: 6af6a2b1435a75a92270ca8671f6866af22de3087d9cec1468d51baef3818544
    contract_hash: 1d106bebcc23b1dfede84330f191bc5200c30cb5640f87051b979c81c37851c6
    binding_hash: b2278b7bab5aaa045872a3b59cbeb207102234e8f5eb568b39bdc99f44ea920c
    fingerprint: dea140c13018408a7c2dd5d7f77b434bc1b3c2d106fa36b2816521b99432a6d3
    fingerprint_components:
      contract: 1d106bebcc23b1dfede84330f191bc5200c30cb5640f87051b979c81c37851c6
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-workspace-vcs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks that a directory with an empty .git directory is refused with GIT_REPOSITORY_UNREADABLE and gets no store (packages/cli/tests/consumer/outside-git.test.ts), that the workspace probe never answers none where a .git entry exists, with or without Git on PATH, or for a missing directory (packages/cli/tests/vcs/workspace-vcs.test.ts), the refusal's code and message (packages/cli/tests/cli-errors.test.ts), the open-failure envelope keeping the code (packages/cli/tests/cli-protocol-mutation.test.ts, packages/cli/tests/cli-json-command.test.ts) and the MCP session throwing the same coded failure (packages/mcp/tests/server/session-coverage.test.ts).
