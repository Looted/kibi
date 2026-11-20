---
title: 'Source proof: kibi-claude runs the bundled MCP launcher'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:43:47.846Z'
id: TEST-proof-claude-mcp-launcher
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-claude-mcp-launcher
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/claude/.mcp.json
    path: /mcpServers/kibi/args
    select: items
  proves:
    - CLAIM-4E46CD7CA044ACA0
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d3442aeaa4ea71a7bf87e2ea
    test_id: TEST-proof-claude-mcp-launcher
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 5e4ea72183e6bb67d7ac5fb9a2e4a8a30cb5f33ff4f497f41b214da3d7d10206
    binding_hash: 65ef718ee98bc4b2de34640d09c8503cbffc75eb8cf49e48415ba667b2f0c9fb
    fingerprint: 18982f2afdd03918a0ad43146e12bba9390a26a8b0053896571d54e01b790fef
    fingerprint_components:
      contract: 5e4ea72183e6bb67d7ac5fb9a2e4a8a30cb5f33ff4f497f41b214da3d7d10206
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
      - symbol_id: SYM-proof-claude-mcp-launcher
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
      test_id: TEST-proof-claude-mcp-launcher
      source:
        reader: json
        file: packages/claude/.mcp.json
        path: /mcpServers/kibi/args
        select: items
      model:
        members:
          - ${CLAUDE_PLUGIN_ROOT}/bin/mcp-launcher.cjs
        sequence:
          - ${CLAUDE_PLUGIN_ROOT}/bin/mcp-launcher.cjs
    certificate_digest: 8639cb0738f5584b29d19c0983071e14eab24db4078200926253da66fb688110
    claim_bindings:
      - claim_key: CLAIM-4E46CD7CA044ACA0
        requirement_id: REQ-claude-plugin-package
        fact_id: FACT-claude-mcp-server-launcher
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - ${CLAUDE_PLUGIN_ROOT}/bin/mcp-launcher.cjs
          operator: eq
---
Reads /mcpServers/kibi/args from packages/claude/.mcp.json and checks it is exactly the bundled launcher.