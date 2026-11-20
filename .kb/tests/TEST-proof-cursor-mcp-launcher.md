---
title: 'Source proof: kibi-cursor runs the bundled MCP launcher'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:53:22.726Z'
id: TEST-proof-cursor-mcp-launcher
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-cursor-mcp-launcher
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/cursor/mcp.json
    path: /mcpServers/kibi/args
    select: items
  proves:
    - CLAIM-EC9C4089EB04AF7B
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7d6e8bc06f988a4798b168f4
    test_id: TEST-proof-cursor-mcp-launcher
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: d86f19eae5b7a13f79192cd86e24164b0c425bb67dd657961462d8a4da53c251
    binding_hash: f6d2fe4aa5246611699eb65a3c34537c0542ab0e7a38bb5709222ba8fc7941b2
    fingerprint: 429bef2cb14ded63005309776e08b78fab11af15a906c2ce6320f49436eab65e
    fingerprint_components:
      contract: d86f19eae5b7a13f79192cd86e24164b0c425bb67dd657961462d8a4da53c251
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
      - symbol_id: SYM-proof-cursor-mcp-launcher
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: source
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-cursor-mcp-launcher
      source:
        reader: json
        file: packages/cursor/mcp.json
        path: /mcpServers/kibi/args
        select: items
      model:
        members:
          - ${CURSOR_PLUGIN_ROOT}/bin/launch-kibi-mcp.mjs
          - ${workspaceFolder}
        sequence:
          - ${CURSOR_PLUGIN_ROOT}/bin/launch-kibi-mcp.mjs
          - ${workspaceFolder}
    certificate_digest: c25c72925ed44940ec1548fed511fcd0bc0969e20c5cc65834e93d809984ffda
    claim_bindings:
      - claim_key: CLAIM-EC9C4089EB04AF7B
        requirement_id: REQ-cursor-plugin-package
        fact_id: FACT-cursor-mcp-server-launcher
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - ${CURSOR_PLUGIN_ROOT}/bin/launch-kibi-mcp.mjs
            - ${workspaceFolder}
          operator: eq
---
Reads /mcpServers/kibi/args from packages/cursor/mcp.json. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
