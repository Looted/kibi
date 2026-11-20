---
title: The default MCP tool catalog holds 19 tools, by an arithmetic proof
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
    - CLAIM-AADF94FC9C4869B4
origin:
  kind: agent
  recorded_at: '2026-10-28T09:29:59.255Z'
id: TEST-proof-mcp-default-tool-count
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4dd2a0df131dc219c6736413
    test_id: TEST-proof-mcp-default-tool-count
    scope: unit
    outcome: passed
    code_snapshot: 3cbdf32b0ca578c0e6fb1cb36066284a666736978a016aff5518fbb451bb6544
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-20T04:36:20.009Z'
    finished_at: '2026-11-20T04:36:21.758Z'
    artifact_digest: b166234eecda283a5db95b7b5107cea375290e0a9b1ac4debfda58174e43703a
    contract_hash: a72734e9f9bb752140cebd5b74d1d7e0208d4fefb964c5821821b2292f02411d
    binding_hash: 9a2b2652fcecd5d44d216d1c44de0ce4c1c6c4cd7e7d80bcf4e0650eb0f7b5c6
    fingerprint: a2f253be6202e1aa8aded84d4fae7e6e8be6b5f656ebbec88afb198edffb2191
    fingerprint_components:
      contract: a72734e9f9bb752140cebd5b74d1d7e0208d4fefb964c5821821b2292f02411d
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
          value: 19
      claim:
        operator: eq
        value: 19
    certificate_digest: fdd8ebc2680828a45bc298c5e3fff806819b04f5d34d0aa32448a9d6a6f60c2e
    claim_bindings:
      - claim_key: CLAIM-AADF94FC9C4869B4
        requirement_id: REQ-kibi-mcp-tool-catalog
        fact_id: FACT-mcp-default-tool-count
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 19
          value_type: int
          variable: default_tool_count
---
Counts the TOOLS registry export and proves the default MCP tool catalog holds 16 tools.