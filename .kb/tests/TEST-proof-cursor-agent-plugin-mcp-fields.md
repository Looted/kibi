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
    receipt_id: PR-28b3409b77b2641753e9270d
    test_id: TEST-proof-cursor-agent-plugin-mcp-fields
    scope: unit
    outcome: passed
    code_snapshot: e54c836d045ddc66e5300f74cfaff528e05df36605bd9587408dc179d35908ca
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:58:59.439Z'
    finished_at: '2026-10-27T07:58:59.610Z'
    artifact_digest: 00f86ec27630c06ed5f079b0bf1056debd9f9241e4029944c7ab1cd6f83b7b73
    contract_hash: eede6477fb6f95454f15f2b61b40ad71e3e079efee9af68175717b9ebaba0d64
    binding_hash: 8cff8892848fa0f45c245619a8f732e58533dae7424e59569272da3c97ddd982
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
        scope: code
        obligation:
          kind: set_relation
          members:
            - $schema
            - mcpServers
          operator: subset_of
---
Reads the top-level fields of packages/cursor/agent-plugin/mcp.json. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
