---
title: Codex receives the discovery summary alone and Cursor and Gemini CLI keep the data copy
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
    - symbol_id: SYM-mcp-tools-coverage-tests
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
id: TEST-mcp-structured-text-codex
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-df46caf339a4e8c827f0ac24
    test_id: TEST-mcp-structured-text-codex
    scope: end_to_end
    outcome: passed
    code_snapshot: 4ae84505607840b85652271c83b4a620cb178812763babb250f0c619e27d9571
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T18:31:02.005Z'
    finished_at: '2026-11-16T18:31:10.468Z'
    artifact_digest: 9bf536b60a3333449fba5f60f07ae4a844c90a24217d0aa5999288f755f0ce29
    contract_hash: f88d0d5d53004fe073e27bd78d0ccf87d1a6d545774d468945d10719a432c1f6
    binding_hash: 062b1052690a593cf6e3d8ab98d7efa081586b6a4bcb9320dcd303f36459562b
    fingerprint: 1a78471ae96f5eceedccfdf35f19d5b48c7ec6c6719ae2dc556356c6761cd257
    fingerprint_components:
      contract: f88d0d5d53004fe073e27bd78d0ccf87d1a6d545774d468945d10719a432c1f6
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
      - symbol_id: SYM-mcp-tools-coverage-tests
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Asserts embedsStructuredText for the Codex launcher name, the codex-mcp-client initialize name, Cursor, gemini-cli-mcp-client and ZCode, and that KIBI_MCP_STRUCTURED_TEXT still overrides the choice (packages/mcp/tests/server/tools-coverage.test.ts); then starts the MCP server over stdio as Codex, Claude Code and Cursor and checks the text part of a real kb_query result (packages/mcp/tests/server/structured-text-host.test.ts).