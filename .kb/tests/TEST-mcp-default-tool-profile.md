---
title: The MCP server lists the default six, the bootstrap tools on an empty knowledge base, and every tool in the full profile
status: passing
priority: must
tags:
  - tool-surface
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-mcp-tool-profile
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
id: TEST-mcp-default-tool-profile
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-292401d80d8e9d4672407454
    test_id: TEST-mcp-default-tool-profile
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: b8fd8042617774c50b7f73d41c1e3a2e5f84809075b20f678ae8b7c735a305ad
    binding_hash: 1859cd1bd8d7ea4f8e0b6bf232ac76aeb0426fd293582c8c018b9c9b931ce509
    fingerprint: 01ae8339b3d295dbd92c709d007a17f15835a5fcda993c0c8a28b4d0e78250b5
    fingerprint_components:
      contract: b8fd8042617774c50b7f73d41c1e3a2e5f84809075b20f678ae8b7c735a305ad
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
      - symbol_id: SYM-test-mcp-tool-profile
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Asserts profile resolution from KIBI_MCP_TOOLS, package.json kibi.mcpTools and .kb/setup.json mcpTools, the empty-knowledge-base check, the listed set per profile and the initialize instructions (packages/mcp/tests/server/tool-profile.test.ts); that registration lists only the profile's tools plus optional tools enabled by name (tool-registration-exact); that startServer passes the default six and their instructions (server-start-exact); and the default and full tool-list budgets over a real server (tool-surface-consumer).