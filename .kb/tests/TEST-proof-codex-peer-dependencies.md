---
title: 'Source proof: kibi-codex peer dependencies'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:49:25.006Z'
id: TEST-proof-codex-peer-dependencies
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-codex-peer-dependencies
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/codex/package.json
    path: /peerDependencies
    select: keys
  proves:
    - CLAIM-2F06E07396A59AF2
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-de85d6fbfb968169e1b2d3ff
    test_id: TEST-proof-codex-peer-dependencies
    scope: unit
    outcome: passed
    code_snapshot: 328fc65d0a8f68d784d40380e03d82ed697fd6e20aa7eac41f724a6c4fd7718a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:50:13.197Z'
    finished_at: '2026-10-27T07:50:13.354Z'
    artifact_digest: fef75d6817cb01d748f4d357af8a9299791259d762bf34a4a77f544d79ff156b
    contract_hash: ab931d462943621d94f8d862f3fc24bab2847ba7ebbbd5fce6242bee2a900c7a
    binding_hash: 9b52316a8bd524b82c050ed2ec8d96a277a938eebd6158d19a16e0ca489a4e34
    fingerprint: e9979bbec73d867d3dabd8998c9a2e1e4995fe356f69084e870da5297c702cd4
    fingerprint_components:
      contract: ab931d462943621d94f8d862f3fc24bab2847ba7ebbbd5fce6242bee2a900c7a
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
      - symbol_id: SYM-proof-codex-peer-dependencies
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
      test_id: TEST-proof-codex-peer-dependencies
      source:
        reader: json
        file: packages/codex/package.json
        path: /peerDependencies
        select: keys
      model:
        members:
          - kibi-cli
          - kibi-mcp
    certificate_digest: 3d4da93e1c1241c82208c8a0a82c4cdeef02a6d64d676f26fcdb3b55c0b95258
    claim_bindings:
      - claim_key: CLAIM-2F06E07396A59AF2
        requirement_id: REQ-codex-plugin-package
        fact_id: FACT-codex-peer-dependencies
        binding: derived
        scope: code
        obligation:
          kind: set_relation
          members:
            - kibi-cli
            - kibi-mcp
          operator: eq
---
Reads the peer dependency names in packages/codex/package.json.