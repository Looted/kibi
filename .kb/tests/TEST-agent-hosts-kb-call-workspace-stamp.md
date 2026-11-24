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
    receipt_id: PR-a088ad59794311ad70ca6143
    test_id: TEST-agent-hosts-kb-call-workspace-stamp
    scope: end_to_end
    outcome: passed
    code_snapshot: 2a97225c8be25095a20724e86a3ee49eb1db2234516bfbf8ef155ee6bbd75aa0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-23T19:28:24.828Z'
    finished_at: '2026-11-23T19:28:36.862Z'
    artifact_digest: a2e1fe47a99e3cf7967a1e8931e26163882114d6f4f43eab5af7e49d3af8530a
    contract_hash: 99dfd8407de1674d01cf5f2b0a356e5d1075826c7d3d5f1219f8ac42f132bbc8
    binding_hash: 14787e99bef614936c0e14e4bbc14c977819aa90071cd3daa27e6e9a3447cad2
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
