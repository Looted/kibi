---
title: Each host's hook puts a change of the Kibi level or a lowered required_evidence to the person
status: passing
verification_scope: end_to_end
verification_perspective: internal
tags:
  - levels
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-agent-hosts-guarded-change-ask
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-25T13:40:12.750Z'
id: TEST-agent-hosts-guarded-change-ask
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e8adc4c2186c8ef3209d425d
    test_id: TEST-agent-hosts-guarded-change-ask
    scope: end_to_end
    outcome: passed
    code_snapshot: 3b4072e0101ab0a60acb4941c3aa10401620c80d23a411c42f0a745b37b4e06a
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T14:09:00.495Z'
    finished_at: '2026-11-25T14:09:02.129Z'
    artifact_digest: 3a28d882100602c3d647a3a3b30ec288f630cf1f0170151bc72c1353b520ae69
    contract_hash: 7b10951144bf3dbf9b6e7526e42995cd99c0bb79ddfeea8cc6a71e69ca0749d6
    binding_hash: ea7d9e0ec30fdcb69a1cb3495f456d359f867546bd4da7d8bfab4815da0dfd71
    fingerprint: 2a648b5f6af382b2c8712c5d888c122f56cd2735014176f97cc5b3a66252ade3
    fingerprint_components:
      contract: 7b10951144bf3dbf9b6e7526e42995cd99c0bb79ddfeea8cc6a71e69ca0749d6
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
      - symbol_id: SYM-test-agent-hosts-guarded-change-ask
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Automated verification lives in `packages/agent-core/tests/level-guard.test.ts` (which edits change the level or lower a floor, before and after the edit, and the texts), the `Kibi level and required evidence` suites of the Claude Code, Antigravity, Codex, Cursor, ZCode and OpenCode hook tests, and the Vibe `guard.test.mjs` and `hooks.test.mjs`. They check that Claude Code and Antigravity put such an edit or kb_upsert to the person in a permission prompt, that Codex, Cursor and ZCode tell the agent to ask the person first and grant no permission, that OpenCode stops the change once per session, and that the Vibe hook tells the agent after the edit or kb_upsert, once per change.
