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
    receipt_id: PR-d6a289fa8f3eda5e1fe1dc9a
    test_id: TEST-claude-edit-snippet-hook
    scope: end_to_end
    outcome: passed
    code_snapshot: 216cfd98a14d6f9a06eb92c6fc15d752812ff64437317fb6a5c2ce92241c6a3e
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-11T17:40:25.566Z'
    finished_at: '2026-11-11T17:40:26.652Z'
    artifact_digest: 0526e57b9ae7672b2cdcfbecec0af8712d151d74e4017bed764c692703d63ace
    contract_hash: 6cb86e9434ba5bee65a60372dcd5fec03da4b3c5eaa870a2d94540aaf8f83e74
    binding_hash: 46e6b6a08d1012216bb5d70f732df29821e16e63951271c4b01e8ed8529e4e22
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
