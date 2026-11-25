---
title: GIT_REQUIRED refusal tests
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
  recorded_at: '2026-11-25T09:17:52.872Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-workspace-vcs
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-git-required
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ccf1c2624a8d717594a91a7e
    test_id: TEST-kibi-git-required
    scope: end_to_end
    outcome: passed
    code_snapshot: ab010f37efcf08fa96a686fb375f97e60fdc390a3cd0d543a237c0bfef7a8124
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-25T11:40:56.844Z'
    finished_at: '2026-11-25T11:41:18.293Z'
    artifact_digest: ff98ee68bc9dedd4b97d307f3706d3fa5eeb85bbaa92337d5de0db68bf1df337
    contract_hash: 1d106bebcc23b1dfede84330f191bc5200c30cb5640f87051b979c81c37851c6
    binding_hash: 6d4eb461e26e3ea0c9c362df37490db6f57af6ffef72b6ac36ae9466b74cb413
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
Checks the refusal text of every Git feature and both boundaries (text commands print Error [GIT_REQUIRED] and exit 1, operations throw a coded, non-retryable refusal) (packages/cli/tests/vcs/workspace-vcs.test.ts), the GitRequired error (packages/cli/tests/cli-errors.test.ts), kibi check-diff refusing before it reads any event (packages/cli/tests/commands-coverage/check-diff.test.ts), the commit gate's refusal and its telemetry category (packages/cli/tests/cli-failure-categories.test.ts) and the built CLI and MCP server refusing kibi check --staged, kibi gc, kibi check-diff, kibi hooks install and impact review (packages/cli/tests/consumer/outside-git.test.ts, packages/mcp/tests/no-git-workspace.test.ts).
