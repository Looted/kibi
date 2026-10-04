---
title: The Cursor preToolUse hook command gives an edit of linked code its requirement, what it must keep true and its decision within the snippet budget
status: passing
priority: must
tags:
  - hooks
  - snippets
  - agent-core
  - e2e
  - cursor
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cursor-edit-snippet-hook
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-cursor-edit-snippet-hook
    target: default
    native_id: packages/cursor/tests/hook-runner.test.ts::Cursor hook command pre-edit knowledge (end to end)::the preToolUse command gives an edit of linked code its requirement, what it must keep true and its decision within the snippet budget
    source_file: packages/cursor/tests/hook-runner.test.ts
    line: 798
origin:
  kind: agent
  recorded_at: '2026-10-04T04:47:11.353Z'
id: TEST-cursor-edit-snippet-hook
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-184594799e707f25810d5164
    test_id: TEST-cursor-edit-snippet-hook
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 912e900c0f679ccd59a3fe074f7a57bc2266536cdbf49af5b219d1658ca09e0e
    binding_hash: ab6d40cc072c8e66454ba8fe829ad8b2fab2789bfdc1aeecca94ccefa275e5f4
    fingerprint: b79898f1cbe79e26705d893411a2595d9c11c3c848cebd558366fa436dd359d1
    fingerprint_components:
      contract: 912e900c0f679ccd59a3fe074f7a57bc2266536cdbf49af5b219d1658ca09e0e
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6079179fb90f0e03f3c8aad584dcafdb9a4c2cb141b4611d274c0289bf439c43
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-cursor-edit-snippet-hook
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
# The Cursor preToolUse hook command gives an edit of linked code its requirement, what it must keep true and its decision within the snippet budget

Runs the command from `packages/cursor/hooks/hooks.json` through a shell as Cursor does, against a fixture KB, using the built `dist/hook-runner.js` (`packages/cursor/tests/hook-runner.test.ts`).

- An edit of requirement-linked code is allowed and its guidance names the requirement, the function the edit is inside, a `must keep true` line with its grounding facts and the `Decision:` ADR line, within the shared snippet budget.
- The snippet is not repeated in the same conversation.
