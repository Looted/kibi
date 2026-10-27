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
    receipt_id: PR-21050712ea1626248990c9d9
    test_id: TEST-proof-claude-published-parts
    scope: unit
    outcome: passed
    code_snapshot: d2d6cab6dbd3f50aadeb2fd0d2dda459b10875fcef0d6b8408b3f76d0b95066d
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:44:17.605Z'
    finished_at: '2026-10-27T07:44:17.778Z'
    artifact_digest: ee7a9d5ef684079d64c716d5e1fe71badeddf6a0d8345ce5175d5b70c416f1f9
    contract_hash: 477809eead8721206575139bbf6e79c88190e6c4164ad0769dae276740919545
    binding_hash: 0e0034938951f307194fe33015d19e389588d56cfb582303ee4831617a79d335
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
    certificate_digest: 78c1d8acd38c51af4801449855daa48d1006533b1cf7d7241bab9ab80dfcaa59
    claim_bindings:
      - claim_key: CLAIM-C3823F88987EFA0A
        requirement_id: REQ-claude-plugin-package
        fact_id: FACT-claude-package-published-parts
        binding: derived
        scope: code
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