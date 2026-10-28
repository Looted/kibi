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
    - CLAIM-CAB0843663E4D5AC
origin:
  kind: agent
  recorded_at: '2026-10-28T09:29:59.255Z'
id: TEST-proof-mcp-default-tool-count
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9837beff1449026cf919d718
    test_id: TEST-proof-mcp-default-tool-count
    scope: unit
    outcome: passed
    code_snapshot: 6712d2faaeb276bece810a9f47b776cabff5dc9c840f0c7ef69c09efba35fb39
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T09:33:08.936Z'
    finished_at: '2026-10-28T09:33:09.242Z'
    artifact_digest: 9547aa1434672d7fc57af99319cbcb19ef207e7657fe027598e2d8dee682244e
    contract_hash: 05218e557a29f30919dcbb2e908d6251cb46341f82b67dcc90e1e52eb70fe0cf
    binding_hash: 692c42b4b2f8b1e64b82769afb973b15d19b89d0068b7b8132239368280b4c14
    fingerprint: c02a77e30a2217fcd14147931ee8ca3fcec4e14a67dbed3e572db58b2811cde4
    fingerprint_components:
      contract: 05218e557a29f30919dcbb2e908d6251cb46341f82b67dcc90e1e52eb70fe0cf
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
          value: 16
      claim:
        operator: eq
        value: 16
    certificate_digest: c2e4be88d2ace1f0e8b709c40c23b63375f845c8bb535483d1040dfbda12ba62
    claim_bindings:
      - claim_key: CLAIM-CAB0843663E4D5AC
        requirement_id: REQ-kibi-mcp-tool-catalog
        fact_id: FACT-mcp-default-tool-count
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 16
          value_type: int
          variable: default_tool_count
---
Counts the TOOLS registry export and proves the default MCP tool catalog holds 16 tools.