---
title: 'Source proof: the portable mcp.json declares its schema'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:57:50.489Z'
id: TEST-proof-cursor-agent-plugin-mcp-schema
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-cursor-agent-plugin-mcp-schema
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/cursor/agent-plugin/mcp.json
    path: /$schema
  proves:
    - CLAIM-3CFB86CAE4410F0A
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ae240105a2b9dc66a5ab317b
    test_id: TEST-proof-cursor-agent-plugin-mcp-schema
    scope: unit
    outcome: passed
    code_snapshot: e54c836d045ddc66e5300f74cfaff528e05df36605bd9587408dc179d35908ca
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:58:50.179Z'
    finished_at: '2026-10-27T07:58:50.369Z'
    artifact_digest: 01acf171633e1d503b79ca0bd218b837fcde5d2202a50a27249b23f0eb22790a
    contract_hash: 9cfc4894121d0389225793f869431340594bf110057a99129e35791c44cf6c36
    binding_hash: 7ed83f4a137ec5350da9308816691494ae0e9a5027be2f3ad1deae939d6e06cd
    fingerprint: e23d636bab9539973b7126a8ff07fabd99659f05b27367181c0633e05c331c69
    fingerprint_components:
      contract: 9cfc4894121d0389225793f869431340594bf110057a99129e35791c44cf6c36
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
      - symbol_id: SYM-proof-cursor-agent-plugin-mcp-schema
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: source
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-cursor-agent-plugin-mcp-schema
      source:
        reader: json
        file: packages/cursor/agent-plugin/mcp.json
        path: /$schema
      model:
        members:
          - https://agent-plugins.org/schemas/1.0.0/mcp.schema.json
    certificate_digest: f1a12b27ef860369839df9ec22ba2ff54f933882b796245a77946b0139f41f4d
    claim_bindings:
      - claim_key: CLAIM-3CFB86CAE4410F0A
        requirement_id: REQ-cursor-agent-plugin-package
        fact_id: FACT-agent-plugin-mcp-schema
        binding: derived
        scope: code
        obligation:
          kind: set_relation
          members:
            - https://agent-plugins.org/schemas/1.0.0/mcp.schema.json
          operator: eq
---
Reads /$schema from packages/cursor/agent-plugin/mcp.json.