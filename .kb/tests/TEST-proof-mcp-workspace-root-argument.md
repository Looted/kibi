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
    receipt_id: PR-c90b50057cbba1c260c646ad
    test_id: TEST-proof-mcp-workspace-root-argument
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: af00f7db61aca2526349c7bdb83601bfebe52f4da748eb9fd216f9d0bc5be653
    binding_hash: abdda1b165e6f10f6721cbacaa28354147bcf8a9c7173ad053b0d22e396a30bd
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