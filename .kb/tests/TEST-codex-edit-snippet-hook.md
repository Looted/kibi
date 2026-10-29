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
    receipt_id: PR-bf5705e4b8e1a95b3dbef786
    test_id: TEST-codex-edit-snippet-hook
    scope: end_to_end
    outcome: passed
    code_snapshot: 91111697f44f76ef846b59b9d6ba6cfc1da295a8a8076e33d9a46e6c923c8a5f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T17:09:30.581Z'
    finished_at: '2026-10-29T17:09:31.269Z'
    artifact_digest: 594425b86d7c32156fbd893c7fc94944aaba756f675cbbe167d1b221ea9ba7fa
    contract_hash: f5d94da48dbfc4a5caa59bb12fb18dba8c24b696b9fb87563539289f33ba8948
    binding_hash: e7f868456e10c510149cb1f1a44a90a073c9d71b9a71e73730657024afd91ea2
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
