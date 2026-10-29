---
title: The MCP server shall route a call by its workspaceRoot argument, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-mcp-workspace-root-argument
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-mcp-WORKSPACE_ROOT_ARGUMENT
  proves:
    - CLAIM-220FC8EBDC962FCB
origin:
  kind: agent
  recorded_at: '2026-10-29T16:35:45.897Z'
id: TEST-proof-mcp-workspace-root-argument
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d15f3be7c960305c9bcd96f4
    test_id: TEST-proof-mcp-workspace-root-argument
    scope: unit
    outcome: passed
    code_snapshot: bdfe8523b43ab1923baec93d2c6ca1678a2a29fbb2eda2060e2b7e26d7310b7b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:36:24.628Z'
    finished_at: '2026-10-29T16:36:24.874Z'
    artifact_digest: 532c0a88bc4c901b866220debf49b8455967d046453eed846502c83244027155
    contract_hash: af00f7db61aca2526349c7bdb83601bfebe52f4da748eb9fd216f9d0bc5be653
    binding_hash: 957043ba2575c04cfc8ca51ec6d18ea5981a7007bbc093a3f4a9ea88b4b1fbf5
    fingerprint: fb1735906a920f4a1f88f995645c479d28e41587ab00f4efdfb9b4a7f670d651
    fingerprint_components:
      contract: af00f7db61aca2526349c7bdb83601bfebe52f4da748eb9fd216f9d0bc5be653
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
      - symbol_id: SYM-proof-mcp-workspace-root-argument
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-mcp-workspace-root-argument
      pattern:
        symbol_id: SYM-mcp-WORKSPACE_ROOT_ARGUMENT
        type: string
        value: workspaceRoot
    certificate_digest: f1a5b3a9ef86ffd215e9dd3793a129c140c0b2cf73c5fd51e33e3cef2a2260aa
    claim_bindings:
      - claim_key: CLAIM-220FC8EBDC962FCB
        requirement_id: REQ-mcp-workspace-root-argument
        fact_id: FACT-mcp-workspace-root-argument
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: workspaceRoot
---
Proves that the MCP server shall route a call by its workspaceRoot argument, against the code Kibi reads at ingest.