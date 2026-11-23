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
    receipt_id: PR-355fec775d2cb36cc954dc6f
    test_id: TEST-proof-cursor-published-parts
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: e436a9b24884727d534b9779a307d35d9541ea97405419d811f0d12f5d5c1314
    binding_hash: 518b0b8c87abac3bcfb360d3c390ff010a00d1d9f7f75aeb5cd8ccb62e6232e7
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
        sequence:
          - .cursor-plugin
          - mcp.json
          - bin
          - hooks
          - skills
          - rules
          - commands
          - agent-plugin
          - dist
          - CHANGELOG.md
    certificate_digest: 39045dff482162b3d43513211079ce480123826f40c7a215d61720c1c896fce5
    claim_bindings:
      - claim_key: CLAIM-59F0EF488D027724
        requirement_id: REQ-cursor-plugin-package
        fact_id: FACT-cursor-package-published-parts
        binding: derived
        scope: source
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
