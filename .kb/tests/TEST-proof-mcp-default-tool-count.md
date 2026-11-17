---
title: The default MCP tool catalog holds 17 tools, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-mcp-default-tool-count
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-TOOLS
      measure: count
  proves:
    - CLAIM-613EE08AA64C3E95
origin:
  kind: agent
  recorded_at: '2026-10-28T09:29:59.255Z'
id: TEST-proof-mcp-default-tool-count
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-23e57ed89e21e9c2de1393d7
    test_id: TEST-proof-mcp-default-tool-count
    scope: unit
    outcome: passed
    code_snapshot: 84a6fe37e5bb684e8e6f19943420ecc7e6817232bebc83407da028d1543f2d38
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T15:25:46.757Z'
    finished_at: '2026-11-17T15:25:58.948Z'
    artifact_digest: d17408d06c38e4a5960dccd647929d1648e2e9f3e0d0cb0e5d57ef97baf62297
    contract_hash: 75a2d013e33dbc6ce983d8bdc15b63e903d4d2b18a98b1f27ab8801d5ff6e8db
    binding_hash: 36323867839764cf001e74e2d438f43d2aef1c4c40051564693ed002e6482f41
    fingerprint: 299223fdaddead9b52792a5b5b9f38cde3a18b1aba366edb354fdfcb5d97a74a
    fingerprint_components:
      contract: 75a2d013e33dbc6ce983d8bdc15b63e903d4d2b18a98b1f27ab8801d5ff6e8db
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
      - symbol_id: SYM-proof-mcp-default-tool-count
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-mcp-default-tool-count
      variable: default_tool_count
      value_type: int
      assumptions:
        - operator: eq
          value: 17
      claim:
        operator: eq
        value: 17
    certificate_digest: 6de71ed8f9f687ad7a10986e1cff250ee51fcd8d50729c4688a8131df5cb7a4d
    claim_bindings:
      - claim_key: CLAIM-613EE08AA64C3E95
        requirement_id: REQ-kibi-mcp-tool-catalog
        fact_id: FACT-mcp-default-tool-count
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 17
          value_type: int
          variable: default_tool_count
---
Counts the TOOLS registry export and proves the default MCP tool catalog holds 16 tools.