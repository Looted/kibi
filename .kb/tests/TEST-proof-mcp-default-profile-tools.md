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
    receipt_id: PR-494cf041fcf641ee9e01fe2d
    test_id: TEST-proof-mcp-default-profile-tools
    scope: unit
    outcome: passed
    code_snapshot: 32ee33b73de52a5faea88037234ee6420cfcba340ad0940b4021a05c62fa772d
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T16:02:41.533Z'
    finished_at: '2026-11-17T16:02:56.993Z'
    artifact_digest: f4887a07f9a9b865fefecdb3eb64200815c603d43fd8b900b1a5dac6d042d0dc
    contract_hash: 748868771407641b861df786517892142442a0c3b8ea44be077cc0852193a0bb
    binding_hash: ad28f15583f40b7e83380246ee41d9bbdc3559cb1b140367eb56b3116a0aa368
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
    evidence_level: tested
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
          - kb_review_firm_edit
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
        - member: kb_review_firm_edit
          outcome: passed
    certificate_digest: b898a53f3a1104e9e0c9cbd5b87bc26a5c3105e795fd1fdf5e46e293dbcd2e26
    claim_bindings:
      - claim_key: CLAIM-C7E3D235BB6D6979
        requirement_id: REQ-mcp-default-tool-profile
        fact_id: FACT-mcp-default-profile-tools
        binding: rejected
        obligation:
          kind: set_equals
          members:
            - kb_check
            - kb_query
            - kb_search
            - kb_skills
            - kb_status
            - kb_upsert
        reason: the domain members Kibi read are not FACT-mcp-default-profile-tools's set (not in the set kb_record, kb_review_firm_edit)
---
Proves that the default profile lists exactly kb_search, kb_query, kb_upsert, kb_check, kb_status and kb_skills, against DEFAULT_PROFILE_TOOLS as Kibi reads it at ingest.