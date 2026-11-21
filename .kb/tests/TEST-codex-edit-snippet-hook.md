---
title: The Codex PreToolUse hook command gives an edit of linked code its requirement, what it must keep true and its decision, once per session
status: passing
priority: must
tags:
  - hooks
  - snippets
  - agent-core
  - e2e
  - codex
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-codex-edit-snippet-hook
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-codex-edit-snippet-hook
    target: default
    native_id: packages/codex/tests/hook-runner.test.ts::Codex hook command pre-edit knowledge (end to end)::the PreToolUse command gives an apply_patch to linked code its requirement, what it must keep true and its decision, once per session
    source_file: packages/codex/tests/hook-runner.test.ts
    line: 712
origin:
  kind: agent
  recorded_at: '2026-10-04T04:46:49.672Z'
id: TEST-codex-edit-snippet-hook
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a68f36e33a1f219f3191fcd5
    test_id: TEST-codex-edit-snippet-hook
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: f5d94da48dbfc4a5caa59bb12fb18dba8c24b696b9fb87563539289f33ba8948
    binding_hash: ae325390a829606eeb2b16c0df5d73b15173f7b8fdc1e2f7bfbeed83f09a7887
    fingerprint: 868668d562c7c87e99fac1f9240632e64437739f08446692482e50c67b054901
    fingerprint_components:
      contract: f5d94da48dbfc4a5caa59bb12fb18dba8c24b696b9fb87563539289f33ba8948
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 7f6cc99c93a4fd2b0901878a61a14f6274b73add66e7737aa52e353bf80ef4b3
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-codex-edit-snippet-hook
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# The Codex PreToolUse hook command gives an edit of linked code its requirement, what it must keep true and its decision, once per session

Runs the command from `packages/codex/hooks/hooks.json` through a shell as Codex does, with the plugin-root environment and a JSON payload on stdin, against a fixture KB (`packages/codex/tests/hook-runner.test.ts`).

- An `apply_patch` to requirement-linked code gets a context that names the requirement, a `must keep true` line with its grounding facts, its `Decision:` ADR line and the covering test, within the shared snippet budget.
- A second hook process in the same session stays silent; a new session gets the same snippet again.
- A file owning more requirements than fit is cut at the budget after its grounding and decision lines.
