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
    receipt_id: PR-0ef25d4404e59816ac2ecb86
    test_id: TEST-cursor-edit-snippet-hook
    scope: end_to_end
    outcome: passed
    code_snapshot: 3b46a71daedb8f4e8d9b0bc6d2618dc0ecdcfdd214efbc6ad031bbb8450393d5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-04T04:50:53.616Z'
    finished_at: '2026-10-04T04:50:53.954Z'
    artifact_digest: f12a04b27114e790fc635b8e3d4253a4302ceec3deb082414b3874152573e8ff
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
