---
title: 'Source proof: kibi-claude publishes its plugin parts'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:43:27.241Z'
id: TEST-proof-claude-published-parts
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-claude-published-parts
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/claude/package.json
    path: /files
    select: items
  proves:
    - CLAIM-C3823F88987EFA0A
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-be2577ef3756a2c6f0207042
    test_id: TEST-proof-claude-published-parts
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 477809eead8721206575139bbf6e79c88190e6c4164ad0769dae276740919545
    binding_hash: d2c0bf5baac7d62211e70e9c88c350d48cdd122a9d464f59ae2a669e0bf1d766
    fingerprint: 22f89ba9717627f5869f842e2e3d0f70489ac6032459565f4ded2e942c8cf11d
    fingerprint_components:
      contract: 477809eead8721206575139bbf6e79c88190e6c4164ad0769dae276740919545
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
      - symbol_id: SYM-proof-claude-published-parts
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
      test_id: TEST-proof-claude-published-parts
      source:
        reader: json
        file: packages/claude/package.json
        path: /files
        select: items
      model:
        members:
          - .claude-plugin
          - .mcp.json
          - CHANGELOG.md
          - LICENSE
          - README.md
          - SECURITY.md
          - bin
          - dist
          - hooks
          - skills
        sequence:
          - .claude-plugin
          - .mcp.json
          - bin
          - hooks
          - skills
          - dist
          - README.md
          - CHANGELOG.md
          - LICENSE
          - SECURITY.md
    certificate_digest: b11fa2a06d92a44cf4c0baa324135b3185499dd6210b7a9710d67c9cb47c0662
    claim_bindings:
      - claim_key: CLAIM-C3823F88987EFA0A
        requirement_id: REQ-claude-plugin-package
        fact_id: FACT-claude-package-published-parts
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - .claude-plugin
            - .mcp.json
            - bin
            - hooks
            - skills
          operator: includes
---
Reads the files list of packages/claude/package.json and checks it includes every plugin part.