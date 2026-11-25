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
    receipt_id: PR-f6283c4a8482123687f8e9a1
    test_id: TEST-kibi-git-required
    scope: end_to_end
    outcome: passed
    code_snapshot: ee534aea2dc460aec4a1e85afd0f57e4da957c2ff23bb33382df882c9767fdb7
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T14:45:15.484Z'
    finished_at: '2026-11-25T14:45:31.063Z'
    artifact_digest: ecc71e1ed1fdaf57d8c2c406cb5203aa22dfabc1e222ae9b04d8337856a68ab7
    contract_hash: 1d106bebcc23b1dfede84330f191bc5200c30cb5640f87051b979c81c37851c6
    binding_hash: 028a2f0fd7e25dfcc055545067803f7a8aeb543267445ce818fc36fcc796ae9f
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
