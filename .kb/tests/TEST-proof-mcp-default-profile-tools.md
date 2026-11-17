---
title: The default MCP profile lists the six core tools, by an exhaustive proof
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
    - symbol_id: SYM-proof-mcp-default-profile-tools
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-mcp-DEFAULT_PROFILE_TOOLS
  proves:
    - CLAIM-7DDAFB6E5A4B6A32
origin:
  kind: agent
  recorded_at: '2026-11-16T22:37:51.170Z'
id: TEST-proof-mcp-default-profile-tools
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0bf1463bd61bf68e1b4763e1
    test_id: TEST-proof-mcp-default-profile-tools
    scope: unit
    outcome: passed
    code_snapshot: df84fc91d0f807889519f20a576fcd787807fc96a14d6cb59f83a53eb62a9ce7
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-17T07:48:22.676Z'
    finished_at: '2026-11-17T07:48:22.989Z'
    artifact_digest: 24a9728c56ff10a6c0cf450471830d6c9446f345b0fb9daa4f5064d21b4ccd95
    contract_hash: 5332671f0963b7d845a36b31555307fb8f79f53034cb5c71e9a7f04de18f4598
    binding_hash: 98be3f9ce0089a4f05828176e35c15934a0e1b0560c72bf50bb3890231f6282c
    fingerprint: 9850e9c98e391302414a7267849156ae165c48ce72f0e03c805dafa45900a56b
    fingerprint_components:
      contract: 5332671f0963b7d845a36b31555307fb8f79f53034cb5c71e9a7f04de18f4598
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
      - symbol_id: SYM-proof-mcp-default-profile-tools
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
      test_id: TEST-proof-mcp-default-profile-tools
      domain:
        symbol_id: SYM-mcp-DEFAULT_PROFILE_TOOLS
        members:
          - kb_search
          - kb_query
          - kb_record
          - kb_upsert
          - kb_check
          - kb_status
          - kb_skills
      results:
        - member: kb_search
          outcome: passed
        - member: kb_query
          outcome: passed
        - member: kb_record
          outcome: passed
        - member: kb_upsert
          outcome: passed
        - member: kb_check
          outcome: passed
        - member: kb_status
          outcome: passed
        - member: kb_skills
          outcome: passed
    certificate_digest: fd89ac71dac8924f60e4d02258c059d998833c89d9f2a97dee4c6b86fce99192
    claim_bindings:
      - claim_key: CLAIM-7DDAFB6E5A4B6A32
        requirement_id: REQ-mcp-default-tool-profile
        fact_id: FACT-mcp-default-profile-tools
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - kb_check
            - kb_query
            - kb_record
            - kb_search
            - kb_skills
            - kb_status
            - kb_upsert
---
Proves that the default profile lists exactly kb_search, kb_query, kb_upsert, kb_check, kb_status and kb_skills, against DEFAULT_PROFILE_TOOLS as Kibi reads it at ingest.