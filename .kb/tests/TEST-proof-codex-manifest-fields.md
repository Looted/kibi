---
title: 'Source proof: the kibi-codex manifest declares its plugin parts'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:48:56.084Z'
id: TEST-proof-codex-manifest-fields
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-codex-manifest-fields
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/codex/.codex-plugin/plugin.json
    path: ''
    select: keys
  proves:
    - CLAIM-AEF7587DBC190FD1
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4c81da98fe5d0472a3ada41c
    test_id: TEST-proof-codex-manifest-fields
    scope: unit
    outcome: passed
    code_snapshot: 328fc65d0a8f68d784d40380e03d82ed697fd6e20aa7eac41f724a6c4fd7718a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:49:46.051Z'
    finished_at: '2026-10-27T07:49:46.220Z'
    artifact_digest: 1fff5ad9ffd5df496f627a8d04ecd21c4c60d12a6c6cde5292dcac51ca05b6d4
    contract_hash: d827e7249b61b847ea0e7dc2762b61c339162f249ae4523e9431c935a1702a0b
    binding_hash: 52643c89b37d36b5be5c87b8fc0bb3f46f1583557e9b710a887a527c4e767611
    fingerprint: 8130e931cb9fd396091c1eb9bf5c187357ad1b76d3cff92602962f9a5f365fdc
    fingerprint_components:
      contract: d827e7249b61b847ea0e7dc2762b61c339162f249ae4523e9431c935a1702a0b
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
      - symbol_id: SYM-proof-codex-manifest-fields
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
      test_id: TEST-proof-codex-manifest-fields
      source:
        reader: json
        file: packages/codex/.codex-plugin/plugin.json
        path: ''
        select: keys
      model:
        members:
          - author
          - description
          - homepage
          - hooks
          - keywords
          - license
          - mcpServers
          - name
          - repository
          - skills
          - version
    certificate_digest: fd7ae2e5a2c8edf45b4da3c2d6decbf8a62f5e6603eb0702dd33e3a519b71ea0
    claim_bindings:
      - claim_key: CLAIM-AEF7587DBC190FD1
        requirement_id: REQ-codex-plugin-package
        fact_id: FACT-codex-manifest-declares-plugin-parts
        binding: derived
        scope: code
        obligation:
          kind: set_relation
          members:
            - hooks
            - mcpServers
            - skills
          operator: includes
---
Reads the top-level fields of packages/codex/.codex-plugin/plugin.json.