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
    receipt_id: PR-440649385d447624b22ce503
    test_id: TEST-proof-cursor-agent-plugin-mcp-schema
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 9cfc4894121d0389225793f869431340594bf110057a99129e35791c44cf6c36
    binding_hash: b2094c5364611f38b952d7e783d7a3950b4eb95590a9cfd75630af055f219cf5
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
        scope: source
        obligation:
          kind: set_relation
          members:
            - https://agent-plugins.org/schemas/1.0.0/mcp.schema.json
          operator: eq
---
Reads /$schema from packages/cursor/agent-plugin/mcp.json. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
