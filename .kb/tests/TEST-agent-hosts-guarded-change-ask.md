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
    receipt_id: PR-61c1841b4c01e6e9d4845726
    test_id: TEST-agent-hosts-guarded-change-ask
    scope: end_to_end
    outcome: passed
    code_snapshot: a6e9d57ef28fbd778b65101c3678e2fbdc990bc4b45f0eb1a7b6111c71e2a124
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T19:10:33.796Z'
    finished_at: '2026-11-25T19:10:35.670Z'
    artifact_digest: b5f0369798164ab981ae2f02c71151fadb3d365294df2de3fb7278208aae8f36
    contract_hash: 7b10951144bf3dbf9b6e7526e42995cd99c0bb79ddfeea8cc6a71e69ca0749d6
    binding_hash: 31962f0d477534bb47a5374fca4cc117786671db0768c0f40d39677a77a55a3e
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
