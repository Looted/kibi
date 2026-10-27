---
title: 'Source proof: kibi-cursor publishes its plugin parts'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:52:30.355Z'
id: TEST-proof-cursor-published-parts
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-cursor-published-parts
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/cursor/package.json
    path: /files
    select: items
  proves:
    - CLAIM-59F0EF488D027724
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-22ff4a8502da4c125ba30036
    test_id: TEST-proof-cursor-published-parts
    scope: unit
    outcome: passed
    code_snapshot: 408bad0aae430e34672d3be58afde18487a6a55e7255f14f4c355346f29a8bf1
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:53:54.753Z'
    finished_at: '2026-10-27T07:53:54.931Z'
    artifact_digest: 1f6f7e609cd771142f9c07ac2edd104a2653ebcaface00a4527db22ae21aca22
    contract_hash: e436a9b24884727d534b9779a307d35d9541ea97405419d811f0d12f5d5c1314
    binding_hash: fc9bb3794bb7e74151954e572c2aa5883e7dbc09d30a500662e0c3e1ba100def
    fingerprint: 52ca0b3f9efe16dc1a89853eaba1b40a8c15978fc1c6280ebb692cde83a30e76
    fingerprint_components:
      contract: e436a9b24884727d534b9779a307d35d9541ea97405419d811f0d12f5d5c1314
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
      - symbol_id: SYM-proof-cursor-published-parts
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
      test_id: TEST-proof-cursor-published-parts
      source:
        reader: json
        file: packages/cursor/package.json
        path: /files
        select: items
      model:
        members:
          - .cursor-plugin
          - CHANGELOG.md
          - agent-plugin
          - bin
          - commands
          - dist
          - hooks
          - mcp.json
          - rules
          - skills
    certificate_digest: de29be866ec3f5b1aef5a048a50042f29ad6f1e67d6293160ef0ead50e4cc50d
    claim_bindings:
      - claim_key: CLAIM-59F0EF488D027724
        requirement_id: REQ-cursor-plugin-package
        fact_id: FACT-cursor-package-published-parts
        binding: derived
        scope: code
        obligation:
          kind: set_relation
          members:
            - .cursor-plugin
            - bin
            - commands
            - hooks
            - mcp.json
            - rules
            - skills
          operator: includes
---
Reads the files list of packages/cursor/package.json. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
