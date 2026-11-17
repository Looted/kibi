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
    receipt_id: PR-f185c43bcb5116047e812d65
    test_id: TEST-mcp-default-tool-profile
    scope: end_to_end
    outcome: passed
    code_snapshot: 32ee33b73de52a5faea88037234ee6420cfcba340ad0940b4021a05c62fa772d
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T16:02:41.533Z'
    finished_at: '2026-11-17T16:02:56.993Z'
    artifact_digest: f4887a07f9a9b865fefecdb3eb64200815c603d43fd8b900b1a5dac6d042d0dc
    contract_hash: b8fd8042617774c50b7f73d41c1e3a2e5f84809075b20f678ae8b7c735a305ad
    binding_hash: ce45a60873aee81c78293ae681ca48512f4473edfe87a15188a4d054693baa88
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