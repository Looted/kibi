---
title: 'Source proof: the portable mcp.json uses only schema fields'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:58:00.223Z'
id: TEST-proof-cursor-agent-plugin-mcp-fields
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-cursor-agent-plugin-mcp-fields
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/cursor/agent-plugin/mcp.json
    path: ''
    select: keys
  proves:
    - CLAIM-55DF8815B6C4466A
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-01ee3ba31746b4be35576f87
    test_id: TEST-proof-cursor-agent-plugin-mcp-fields
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: eede6477fb6f95454f15f2b61b40ad71e3e079efee9af68175717b9ebaba0d64
    binding_hash: 0838dcd3ddcfe964ae946efbb66bd96cc7ecdaad508434be9776c4d20f7b8477
    fingerprint: 7d8a234c06b38ded91391a7a0dba51aa894a234c66e4995b06b33064648835d1
    fingerprint_components:
      contract: eede6477fb6f95454f15f2b61b40ad71e3e079efee9af68175717b9ebaba0d64
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
      - symbol_id: SYM-proof-cursor-agent-plugin-mcp-fields
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
      test_id: TEST-proof-cursor-agent-plugin-mcp-fields
      source:
        reader: json
        file: packages/cursor/agent-plugin/mcp.json
        path: ''
        select: keys
      model:
        members:
          - $schema
          - mcpServers
    certificate_digest: 6d47e32fa1f26a3a280bbb0c4142919106a85ce6b7186f72cb974ea691f5c93a
    claim_bindings:
      - claim_key: CLAIM-55DF8815B6C4466A
        requirement_id: REQ-cursor-agent-plugin-package
        fact_id: FACT-agent-plugin-mcp-fields
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - $schema
            - mcpServers
          operator: subset_of
---
Reads the top-level fields of packages/cursor/agent-plugin/mcp.json. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
