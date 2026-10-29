---
title: The Claude Code PreToolUse hook command gives a first edit of linked code its requirement, what it must keep true and its decision within the snippet budget
status: passing
priority: must
tags:
  - hooks
  - snippets
  - agent-core
  - e2e
  - claude
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-claude-edit-snippet-hook
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-claude-edit-snippet-hook
    target: default
    native_id: packages/claude/tests/hook-runner.test.ts::hook command pre-edit snippet (end to end)::the PreToolUse command gives a first Edit of linked code its requirement, what it must keep true and its decision within the snippet budget
    source_file: packages/claude/tests/hook-runner.test.ts
    line: 740
origin:
  kind: agent
  recorded_at: '2026-10-04T04:47:25.886Z'
id: TEST-claude-edit-snippet-hook
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-421af64e02d3a7a8b1f5a029
    test_id: TEST-claude-edit-snippet-hook
    scope: end_to_end
    outcome: passed
    code_snapshot: 8d023642f2d3b7e5339d3b88aef78ca7225877c8dc42ff4f947c96219805b463
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:32:23.939Z'
    finished_at: '2026-10-29T16:32:26.380Z'
    artifact_digest: 265f12da2773ea84372d8609edc9433a1ded54d000895b2341fbefffa0a36ea8
    contract_hash: 6cb86e9434ba5bee65a60372dcd5fec03da4b3c5eaa870a2d94540aaf8f83e74
    binding_hash: 172b1aabcfa86f185905434cc2aaf3b52c5c991d0a52344d6159ff051d7e02e6
    fingerprint: 27a8fbb9ce6f903b195e832174dbd09a5d43afe7df0dde71f8db4f5c66c16cb7
    fingerprint_components:
      contract: 6cb86e9434ba5bee65a60372dcd5fec03da4b3c5eaa870a2d94540aaf8f83e74
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: b6f0a46cee7c39f2cbf418396eda9d4b71b8a6f0d1dd0ca8208b94584135b74f
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-claude-edit-snippet-hook
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# The Claude Code PreToolUse hook command gives a first edit of linked code its requirement, what it must keep true and its decision within the snippet budget

Runs the command from `packages/claude/hooks/hooks.json` through a shell as Claude Code does, against a fixture KB, using the committed `bin/hook-runner.mjs` bundle (`packages/claude/tests/hook-runner.test.ts`).

- The PreToolUse matcher selects `Edit`.
- A first edit of requirement-linked code gets a context naming the requirement, a `must keep true` line with its grounding facts and the `Decision:` ADR line, within the shared snippet budget.
- Repeating the same edit prints an empty result.
