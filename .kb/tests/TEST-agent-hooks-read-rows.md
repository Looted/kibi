---
title: Read and search requirement rows across hosts
status: passing
priority: must
tags:
  - hooks
  - read-rows
  - agent-core
  - claude
  - antigravity
  - codex
  - cursor
  - zcode
  - opencode
  - vibe
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-agent-hooks-read-rows
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-25T14:26:43.207Z'
id: TEST-agent-hooks-read-rows
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-130ea2e943b553feeaf4f9ce
    test_id: TEST-agent-hooks-read-rows
    scope: end_to_end
    outcome: passed
    code_snapshot: f5a9b794d97aa28aa60a6c70b505b36cd7ce0fe47079bef8e5f51a0bde5046b4
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T15:07:31.719Z'
    finished_at: '2026-11-25T15:07:35.594Z'
    artifact_digest: d4f321c38eb99fe6e543a6f97ec19ba2d8195f07421f1b26677d23c0a1abf01a
    contract_hash: e5a79d208dbf4e8f6648581bed7a45b51156812f043917882172cb4a385507b2
    binding_hash: 8e3cfcd39f9b394c855dcec8af50d52d37eed8733e3b569cb43c9fd8dd50ebe0
    fingerprint: e7dd0fd2b5e97456bf77de8889c32833749a6ea71629835bd77e2956e0e21df1
    fingerprint_components:
      contract: e5a79d208dbf4e8f6648581bed7a45b51156812f043917882172cb4a385507b2
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
      - symbol_id: SYM-test-agent-hooks-read-rows
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs packages/agent-core/tests/read-context.test.ts (rows for the lines in view, the focused symbol first, the per-event and per-session budgets, each requirement once, a firm focused requirement once, the busy-file id line, grep match ranking and the 6-requirement limit) and packages/agent-core/tests/bash-command.test.ts (every file a shell command names, sed -n, head, tail and grep -n ranges). The host tests run each host's hook on read, search and shell calls: packages/claude/tests/hook-runner.test.ts, packages/antigravity/tests/hook-runner-branches.test.ts, packages/cursor/tests/hook-runner.test.ts, packages/codex/tests/hook-runner.test.ts, packages/zcode/tests/hook-runner.test.ts, packages/opencode/tests/decision-hooks.test.ts and packages/vibe/tests/guard.test.mjs.

A false pass would be a fixture whose symbols carry no line coordinates, so every read counts as the whole file and focus is never checked.
