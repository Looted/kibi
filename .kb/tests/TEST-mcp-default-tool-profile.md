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
    receipt_id: PR-010a884ac5c04e2d3e993e4f
    test_id: TEST-mcp-default-tool-profile
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e1a35595507b0061b876834b1a8d6f939d847c9e3f9eb75fe8995ff242c19cc
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-26T10:33:17.528Z'
    finished_at: '2026-11-26T10:33:31.170Z'
    artifact_digest: 7731db072192fcd13ad8c4dd6e2076504ca367e8196ae56b6e92f462b7fcd775
    contract_hash: b8fd8042617774c50b7f73d41c1e3a2e5f84809075b20f678ae8b7c735a305ad
    binding_hash: 0a9803591f7df96ab61c6fc6a85cb44ea26670bf73cce4ed20daa3d602826982
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
Asserts profile resolution from KIBI_MCP_TOOLS, package.json kibi.mcpTools and .kb/setup.json mcpTools, the empty-knowledge-base check, the listed set per profile, Kibi level, empty knowledge base and impact policy, and the initialize instructions (which name every hidden tool but kb_ingest_proof at level remember) (packages/mcp/tests/server/tool-profile.test.ts); that registration lists only the profile's tools plus optional tools enabled by name (tool-registration-exact); that startServer passes the default six and their instructions (server-start-exact); and the default and full tool-list budgets over a real server (tool-surface-consumer).