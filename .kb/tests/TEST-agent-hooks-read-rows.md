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
    receipt_id: PR-7782c875897bb9a8a1871a61
    test_id: TEST-agent-hooks-read-rows
    scope: end_to_end
    outcome: passed
    code_snapshot: e299d56fe494f7958fb9f65f64f76a995a79f1bb8b2e98ccd2e9ee3f39867b62
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-25T14:47:11.795Z'
    finished_at: '2026-11-25T14:47:15.655Z'
    artifact_digest: 8033f1fbb69d239a5f0b89a46bdfccd5ba84aab828262b2415a1e50bb00433ee
    contract_hash: e5a79d208dbf4e8f6648581bed7a45b51156812f043917882172cb4a385507b2
    binding_hash: f8b4e193b5fbb07183f9615f1f572cd1ae0e68888321ac4a5672c536e7dc165b
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
