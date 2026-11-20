---
title: The optional MCP tools are kb_sparql_remote and kb_job_status, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-mcp-optional-tools
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-mcp-optional-tool-names
  proves:
    - CLAIM-86C95EB0D9054676
origin:
  kind: agent
  recorded_at: '2026-10-28T09:30:02.874Z'
id: TEST-proof-mcp-optional-tools
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-33bd7b6b46c42161bcc99529
    test_id: TEST-proof-mcp-optional-tools
    scope: unit
    outcome: passed
    code_snapshot: 3cbdf32b0ca578c0e6fb1cb36066284a666736978a016aff5518fbb451bb6544
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-20T04:38:39.401Z'
    finished_at: '2026-11-20T04:38:39.642Z'
    artifact_digest: a7da283d58ce154357427b4d5b6ee82f89d3ab98f0348bcd691555543676459b
    contract_hash: 2f1e28b56779dbfc0e43dfdfe72a6b13a69dd15cfb81eaa5afbce6706f113c16
    binding_hash: c4d64d92ef1428702c9033debc7585ad0af59fd00fb3385317999eed2ca4484e
    fingerprint: 50600cea4e00d433d619fd721641f60013efd169c9e063c7a5b7d73c68a0e9f3
    fingerprint_components:
      contract: 2f1e28b56779dbfc0e43dfdfe72a6b13a69dd15cfb81eaa5afbce6706f113c16
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
      - symbol_id: SYM-proof-mcp-optional-tools
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-mcp-optional-tools
      domain:
        symbol_id: SYM-mcp-optional-tool-names
        members:
          - kb_sparql_remote
          - kb_job_status
      results:
        - member: kb_sparql_remote
          outcome: passed
        - member: kb_job_status
          outcome: passed
    certificate_digest: 51500c42b791e4f2b9a51e0887b16e42f12093282fbf6cff99063b6e41aac5cd
    claim_bindings:
      - claim_key: CLAIM-86C95EB0D9054676
        requirement_id: REQ-kibi-mcp-tool-catalog
        fact_id: FACT-mcp-optional-tool-names
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - kb_job_status
            - kb_sparql_remote
---
Reads OPTIONAL_TOOL_NAMES and proves it names exactly kb_sparql_remote and kb_job_status, neither of which is in the default catalog.