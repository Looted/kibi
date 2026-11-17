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
    - CLAIM-C7E3D235BB6D6979
origin:
  kind: agent
  recorded_at: '2026-11-16T22:37:51.170Z'
id: TEST-proof-mcp-default-profile-tools
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-94deceb8f511338c70c6fbff
    test_id: TEST-proof-mcp-default-profile-tools
    scope: unit
    outcome: passed
    code_snapshot: e2c40d42d8dd76f889eb95ae616cbeb2c38c0bf586612fa659b8ea469ecc482c
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T23:07:07.876Z'
    finished_at: '2026-11-16T23:07:25.483Z'
    artifact_digest: c76441d57826638b1dbbf1775267472540eb475414eb4eb4870b3b2b6a4c9468
    contract_hash: 748868771407641b861df786517892142442a0c3b8ea44be077cc0852193a0bb
    binding_hash: 85c678eef39cbce6800817a210aa4756379dd6276d1e585b3ccd1d8e298f7179
    fingerprint: cf699a7752c87deafdf3607c4138c003d36498517497afb65c7f8a1440476f82
    fingerprint_components:
      contract: 748868771407641b861df786517892142442a0c3b8ea44be077cc0852193a0bb
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
          - kb_upsert
          - kb_check
          - kb_status
          - kb_skills
      results:
        - member: kb_search
          outcome: passed
        - member: kb_query
          outcome: passed
        - member: kb_upsert
          outcome: passed
        - member: kb_check
          outcome: passed
        - member: kb_status
          outcome: passed
        - member: kb_skills
          outcome: passed
    certificate_digest: bd2132c748f2f0e511aecc2fbc3a989bbea86bf1acb1b18f08effba0fd89f470
    claim_bindings:
      - claim_key: CLAIM-C7E3D235BB6D6979
        requirement_id: REQ-mcp-default-tool-profile
        fact_id: FACT-mcp-default-profile-tools
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - kb_check
            - kb_query
            - kb_search
            - kb_skills
            - kb_status
            - kb_upsert
---
Proves that the default profile lists exactly kb_search, kb_query, kb_upsert, kb_check, kb_status and kb_skills, against DEFAULT_PROFILE_TOOLS as Kibi reads it at ingest.