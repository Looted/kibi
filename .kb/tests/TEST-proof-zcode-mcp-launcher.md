---
title: The kibi-zcode MCP server runs the bundled launcher, by a source proof
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:27:44.708Z'
id: TEST-proof-zcode-mcp-launcher
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-zcode-mcp-launcher
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/zcode/.zcode-plugin/plugin.json
    path: /mcpServers/kibi/args
    select: items
  proves:
    - CLAIM-DA997A6FCF6F4FF1
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e52d602263947b50c1d23063
    test_id: TEST-proof-zcode-mcp-launcher
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 39e651fbbb17ca008ef8085981187ad7d62053a331b0d16110f0313d96603853
    binding_hash: a4d045ec4f4f7d29be8af4e78787cc584b43d289f21ac6c717cc6a4dab049868
    fingerprint: 9a25954881d18f0d4fe50f259387bedf7b2f0f6869e0f42235564b6ca363414a
    fingerprint_components:
      contract: 39e651fbbb17ca008ef8085981187ad7d62053a331b0d16110f0313d96603853
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
      - symbol_id: SYM-proof-zcode-mcp-launcher
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
      test_id: TEST-proof-zcode-mcp-launcher
      source:
        reader: json
        file: packages/zcode/.zcode-plugin/plugin.json
        path: /mcpServers/kibi/args
        select: items
      model:
        members:
          - ${ZCODE_PLUGIN_ROOT}/bin/mcp-launcher.cjs
        sequence:
          - ${ZCODE_PLUGIN_ROOT}/bin/mcp-launcher.cjs
    certificate_digest: f16fe7540fcfebd89cee5c04a67abcb4ce94dfbeb34b9d42e897bb96e5444ef6
    claim_bindings:
      - claim_key: CLAIM-DA997A6FCF6F4FF1
        requirement_id: REQ-zcode-plugin-package
        fact_id: FACT-zcode-mcp-server-launcher
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - ${ZCODE_PLUGIN_ROOT}/bin/mcp-launcher.cjs
          operator: eq
---
Proves that the kibi MCP server in the kibi-zcode manifest runs only the bundled mcp-launcher.cjs: Kibi reads the server arguments itself.