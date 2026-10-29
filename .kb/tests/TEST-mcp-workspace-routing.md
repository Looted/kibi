---
title: kibi-mcp routes each call to the caller's workspace and reports mismatches
status: passing
priority: must
tags:
  - mcp
  - worktree
  - routing
  - review:context-missing
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
    receipt_id: PR-8b698b5510ab6c9b8d4155e8
    test_id: TEST-mcp-workspace-routing
    scope: end_to_end
    outcome: passed
    code_snapshot: bdfe8523b43ab1923baec93d2c6ca1678a2a29fbb2eda2060e2b7e26d7310b7b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:36:12.481Z'
    finished_at: '2026-10-29T16:36:13.314Z'
    artifact_digest: d1cd5f34d6c34e81beed0fc906dce89187fa3071a6e4ee9b8ee26cac9fe9605b
    contract_hash: 8ee149a9b2ec2d43f16f3c00349459ee7d8f3d3b943b030e1d44e42c329ddb0c
    binding_hash: a92dd9056033a954d0a19b540b03b0c210b968221bbb3b4e71996813d6f4b257
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
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
