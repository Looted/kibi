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
    receipt_id: PR-a4dcbaffa88a0d09969c31ee
    test_id: TEST-proof-mcp-optional-tools
    scope: unit
    outcome: passed
    code_snapshot: 84a6fe37e5bb684e8e6f19943420ecc7e6817232bebc83407da028d1543f2d38
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T15:25:46.757Z'
    finished_at: '2026-11-17T15:25:58.948Z'
    artifact_digest: d17408d06c38e4a5960dccd647929d1648e2e9f3e0d0cb0e5d57ef97baf62297
    contract_hash: 2f1e28b56779dbfc0e43dfdfe72a6b13a69dd15cfb81eaa5afbce6706f113c16
    binding_hash: a76fd3a8dbd3fb994940a89fbf0af7e2eec87b67aa35bac5cebeac1b5ac0bd0e
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