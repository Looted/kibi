---
title: kibi-mcp routes each call to the caller's workspace and reports mismatches
status: passing
priority: must
tags:
  - mcp
  - worktree
  - routing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-mcp-workspace-routing
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-mcp-workspace-routing
    target: default
    native_id: packages/mcp/tests/server/workspace-router.test.ts::explicit workspaceRoot::routes to the named workspace and strips the argument
    source_file: packages/mcp/tests/server/workspace-router.test.ts
    line: 179
id: TEST-mcp-workspace-routing
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-eed31b19539d2f1fd2902bfe
    test_id: TEST-mcp-workspace-routing
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 8ee149a9b2ec2d43f16f3c00349459ee7d8f3d3b943b030e1d44e42c329ddb0c
    binding_hash: 497483c4d9da9d71e4b2b2ff4b1a7bb0d2b6b4d303600eb583991f8ec362ba93
    fingerprint: fb5aa62f918cec29fc44939bba7cfb9fab18409d79281079225a94a67bd90c98
    fingerprint_components:
      contract: 8ee149a9b2ec2d43f16f3c00349459ee7d8f3d3b943b030e1d44e42c329ddb0c
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 61e84f3d01d7a8b5f50fa00f2eba3289813281c831ae1233106eff51c738b89e
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-mcp-workspace-routing
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 6): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
Hosts start one MCP server per project, then the agent works elsewhere, often in a worktree. The server kept answering from the checkout it started in, on another branch, and the result never said so. Source: PR 324.
