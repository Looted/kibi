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
    receipt_id: PR-86aa11bd15f30de1c6dd4f22
    test_id: TEST-proof-cursor-mcp-launcher
    scope: unit
    outcome: passed
    code_snapshot: deaa38704483739241c070e9b69174f84cdb3a042e29025eeecfcee689f8b8db
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T09:25:13.221Z'
    finished_at: '2026-10-27T09:25:13.416Z'
    artifact_digest: cc78c612d7d5a44311295110d94c6a0b4170ec183d4866c0b5746446a8ae62d0
    contract_hash: d86f19eae5b7a13f79192cd86e24164b0c425bb67dd657961462d8a4da53c251
    binding_hash: 72735e883fc97920d70e6956d5db287887566e42cdc3e53d1126a193a0febc1e
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
    certificate_digest: 509ce0196a2f8668ba342ee9ff901b4c966b0c24fb8e4c89f429c34e4e2dd68e
    claim_bindings:
      - claim_key: CLAIM-EC9C4089EB04AF7B
        requirement_id: REQ-cursor-plugin-package
        fact_id: FACT-cursor-mcp-server-launcher
        binding: derived
        scope: code
        obligation:
          kind: set_relation
          members:
            - ${CURSOR_PLUGIN_ROOT}/bin/launch-kibi-mcp.mjs
            - ${workspaceFolder}
          operator: eq
---
Reads /mcpServers/kibi/args from packages/cursor/mcp.json. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
