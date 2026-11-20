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
    receipt_id: PR-54e812d150f60458a4c0d337
    test_id: TEST-proof-mcp-workspace-root-argument
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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