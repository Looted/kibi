---
title: The default MCP tool catalog holds 16 tools, by an arithmetic proof
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
    receipt_id: PR-bca35dd491c236244a8e84cc
    test_id: TEST-proof-mcp-default-tool-count
    scope: unit
    outcome: passed
    code_snapshot: df84fc91d0f807889519f20a576fcd787807fc96a14d6cb59f83a53eb62a9ce7
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-17T07:48:25.689Z'
    finished_at: '2026-11-17T07:48:26.017Z'
    artifact_digest: ce5ecee143c3931045c005b8b1106d3a6ce2cad63a3aec2d46c9e6d4bcb72379
    contract_hash: 75a2d013e33dbc6ce983d8bdc15b63e903d4d2b18a98b1f27ab8801d5ff6e8db
    binding_hash: b49a1ae66b0ba8e4f9d4f986cf2817ec80a848a371b02456c284139f683956b0
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