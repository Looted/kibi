---
title: The core MCP profile lists the eight core tools, by an exhaustive proof
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
    - CLAIM-D4F4BDAAF64421B5
origin:
  kind: agent
  recorded_at: '2026-11-16T22:37:51.170Z'
id: TEST-proof-mcp-default-profile-tools
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c33149309ba0643fb85892da
    test_id: TEST-proof-mcp-default-profile-tools
    scope: unit
    outcome: passed
    code_snapshot: bf728393848d8d041bb9f4f7426a9989adf51075b0700112dffd0fb3e965a69e
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T18:50:43.658Z'
    finished_at: '2026-11-17T18:50:56.400Z'
    artifact_digest: 0dd89fba0e87fd074e05f7546ce0b1789adf24cd3623664838b77c818cdb87fb
    contract_hash: 7ddfe8cdec91449ff2468bf2cdecc617c1e395ec03647d86c6c8c4854b255e34
    binding_hash: ade32e4eca29774d8cbc8df26604b2ca9e3b7a73c326b5461ee091c896533caa
    fingerprint: 51dd9db904c965089b615a56efffc553a0ceb7e9fc14249e34ffa0bc727d2689
    fingerprint_components:
      contract: 7ddfe8cdec91449ff2468bf2cdecc617c1e395ec03647d86c6c8c4854b255e34
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
      - claim_key: CLAIM-D4F4BDAAF64421B5
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
            - kb_review_firm_edit
            - kb_search
            - kb_skills
            - kb_status
            - kb_upsert
---
Proves that the default profile lists exactly kb_search, kb_query, kb_upsert, kb_check, kb_status and kb_skills, against DEFAULT_PROFILE_TOOLS as Kibi reads it at ingest.