---
title: The shared session brief is what every host adapter, the MCP server and kb_status open with
status: passing
priority: must
tags:
  - session-brief
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-session-brief
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T17:00:00.000Z'
id: TEST-session-brief
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-56bef2ce93f44b0ba138e5fe
    test_id: TEST-session-brief
    scope: end_to_end
    outcome: passed
    code_snapshot: df84fc91d0f807889519f20a576fcd787807fc96a14d6cb59f83a53eb62a9ce7
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-17T07:52:08.547Z'
    finished_at: '2026-11-17T07:52:12.232Z'
    artifact_digest: 77d5ffd33d0bd5506e6e67c9b550691474c8cd35c2b5eabefdce8c68e30aff5c
    contract_hash: 0985abde36a4ebb411e5c2cee7e525163ab7063bc98cf3aea9d2cb34dde4b6ff
    binding_hash: 30d51d91e8ce41d08c12204d8a69e5bb881e8626fc445ba2e0b9010e008a6c45
    fingerprint: 5bf07a0398005f5a2222dad5847319d4d40c14f32fb87ad67a2392b2d4d36e69
    fingerprint_components:
      contract: 0985abde36a4ebb411e5c2cee7e525163ab7063bc98cf3aea9d2cb34dde4b6ff
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
      - symbol_id: SYM-test-session-brief
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Asserts the brief's lines (search, record, check, conflict rule), its size and how host lines follow it (packages/agent-core/tests/session-brief.test.ts), then that each surface carries it: the Claude Code session-start context, the Codex and Cursor SessionStart hook output, the ZCode session context, the OpenCode system prompt for an active workspace and none without a knowledge base, the MCP initialize instructions, and the kb_status result. A false pass would need a host that builds the brief's text by hand rather than importing it, which the exact-string assertions still catch.