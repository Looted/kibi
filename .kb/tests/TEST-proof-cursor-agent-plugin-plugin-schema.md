---
title: 'Source proof: the portable plugin.json declares its schema'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:57:17.757Z'
id: TEST-proof-cursor-agent-plugin-plugin-schema
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-cursor-agent-plugin-plugin-schema
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/cursor/agent-plugin/plugin.json
    path: /$schema
  proves:
    - CLAIM-E646BF9B4FA68963
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-277456501a4db6d5fdfc05bf
    test_id: TEST-proof-cursor-agent-plugin-plugin-schema
    scope: unit
    outcome: passed
    code_snapshot: e54c836d045ddc66e5300f74cfaff528e05df36605bd9587408dc179d35908ca
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:58:20.936Z'
    finished_at: '2026-10-27T07:58:21.117Z'
    artifact_digest: 5ea0ddccca0cff498e5a1b549cf3e1d218e54d68626bc8982c0f7122d389e1ee
    contract_hash: 98cc903b6e9de7b05c9563d063acd2012cd483050eef44bd5fda761cedb2942e
    binding_hash: 8cde170b8aa591d5c09f3e6c7823f3dae9895c47f34ffd79cc30532a4f243bfd
    fingerprint: de540af4ae773db12dd6c7dd93979eb10ca56f2ae65618734bd233c2049fbdae
    fingerprint_components:
      contract: 98cc903b6e9de7b05c9563d063acd2012cd483050eef44bd5fda761cedb2942e
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
      - symbol_id: SYM-proof-cursor-agent-plugin-plugin-schema
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
      test_id: TEST-proof-cursor-agent-plugin-plugin-schema
      source:
        reader: json
        file: packages/cursor/agent-plugin/plugin.json
        path: /$schema
      model:
        members:
          - https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
    certificate_digest: b59b18fa6003ef4019c2ec2ee06c4e77793b9c75ad8b3601dc67885d3f17d7d3
    claim_bindings:
      - claim_key: CLAIM-E646BF9B4FA68963
        requirement_id: REQ-cursor-agent-plugin-package
        fact_id: FACT-agent-plugin-manifest-schema
        binding: derived
        scope: code
        obligation:
          kind: set_relation
          members:
            - https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
          operator: eq
---
Reads /$schema from packages/cursor/agent-plugin/plugin.json.