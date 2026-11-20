---
title: Every host hook imports the shared path, Kibi MCP call and knowledge index decisions and declares none of its own
status: passing
tags:
  - hooks
  - agent-core
  - claude
  - codex
  - cursor
  - zcode
verification_scope: unit
verification_perspective: internal
text_ref: packages/agent-core/tests/shared-hook-inputs.test.ts
origin:
  kind: agent
  recorded_at: '2026-11-04T14:37:06.710Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-agent-core-shared-hook-inputs
      target: default
  success_policy: all_required_first_attempt
id: TEST-agent-core-shared-hook-inputs
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4bccdd2f42da351c29614f78
    test_id: TEST-agent-core-shared-hook-inputs
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 43bf924e57bd6ec34ae7f092d9155d79eba8e8ad4b0eb1393c09c46475743292
    binding_hash: 2d360c61dc03008c02c5d198cd325ab9fc58af980c23d6c3eb93c2513199f8b0
    fingerprint: 72e3996a247df907a49880340e24824abc57a5afa71aa690827f6de85ec81312
    fingerprint_components:
      contract: 43bf924e57bd6ec34ae7f092d9155d79eba8e8ad4b0eb1393c09c46475743292
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
      - symbol_id: SYM-unit-test-agent-core-shared-hook-inputs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# Every host hook imports the shared path, Kibi MCP call and knowledge index decisions and declares none of its own

Runs `packages/agent-core/tests/shared-hook-inputs.test.ts`. For each of the Claude Code, Codex, Cursor and ZCode packages it reads the host's TypeScript sources and checks that they import `classifyPath`, `loadKnowledgeIndex` and the MCP tool name rule from kibi-agent-core, and that any local function with the same name only returns a call to the shared one. A fixture that redefines `classifyPath` shows the check catches a host that forks the decision.
