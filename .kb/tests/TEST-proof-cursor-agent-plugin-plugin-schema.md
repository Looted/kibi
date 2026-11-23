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
    receipt_id: PR-f5c7f484d55787e8f1775c4f
    test_id: TEST-proof-cursor-agent-plugin-plugin-schema
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 98cc903b6e9de7b05c9563d063acd2012cd483050eef44bd5fda761cedb2942e
    binding_hash: a18fea0127b4fc772e66e6e039fdbc27bea5d58ef913d938c792a1f02f17bff4
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
        scope: source
        obligation:
          kind: set_relation
          members:
            - https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
          operator: eq
---
Reads /$schema from packages/cursor/agent-plugin/plugin.json. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
