---
title: Host Kibi MCP call workspace stamp tests
status: passing
priority: should
tags:
  - hooks
  - agent-core
  - claude
  - codex
  - cursor
  - zcode
  - mcp
  - worktree
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-agent-hosts-kb-call-workspace-stamp
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-23T17:55:47.985Z'
id: TEST-agent-hosts-kb-call-workspace-stamp
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-cc4654eb87178682ebd7dc73
    test_id: TEST-agent-hosts-kb-call-workspace-stamp
    scope: end_to_end
    outcome: passed
    code_snapshot: e604bc19abddc400eaf3439496fcebfaa156c54c053d8fe9941e928b2c5544c3
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-23T18:21:34.422Z'
    finished_at: '2026-11-23T18:21:48.166Z'
    artifact_digest: 48a6778b68be769f7b3d89d0d6cdf52a99d4d0abe7ea45f85fb202c471453e9d
    contract_hash: 99dfd8407de1674d01cf5f2b0a356e5d1075826c7d3d5f1219f8ac42f132bbc8
    binding_hash: 1cf3d12d71d6bbdbc16ed88361e15f18f4451d0defaa4e69a279a2e0534121bb
    fingerprint: 0c188f93730982d7c5d977791d868028f489ef35a07d39446d48eaf21a30a659
    fingerprint_components:
      contract: 99dfd8407de1674d01cf5f2b0a356e5d1075826c7d3d5f1219f8ac42f132bbc8
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
      - symbol_id: SYM-test-agent-hosts-kb-call-workspace-stamp
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the Kibi MCP call stamping tests of the shared helper and of the Claude Code, Codex, Cursor and ZCode hook runners, and checks that a call that carries no workspace gets the session's workspace and that a call that names a workspace is left as it is (packages/agent-core/tests/kb-mcp-tools.test.ts, packages/claude/tests/hook-runner.test.ts, packages/codex/tests/hook-runner.test.ts, packages/cursor/tests/hook-runner.test.ts, packages/zcode/tests/hook-runner.test.ts).
