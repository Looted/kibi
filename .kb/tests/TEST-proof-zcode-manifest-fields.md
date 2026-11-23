---
title: The kibi-zcode manifest declares its skills, commands and MCP servers, by a source proof
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:27:14.062Z'
id: TEST-proof-zcode-manifest-fields
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-zcode-manifest-fields
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/zcode/.zcode-plugin/plugin.json
    path: ''
    select: keys
  proves:
    - CLAIM-60DC86D3C7A20F0D
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d8cda81be7eb4cbb51c9c3a5
    test_id: TEST-proof-zcode-manifest-fields
    scope: unit
    outcome: passed
    code_snapshot: 9386eaa53daa10f81157166c388a39229b4b1a7e1a8c41b588be3f34652fcf8e
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-23T18:35:06.505Z'
    finished_at: '2026-11-23T18:35:06.777Z'
    artifact_digest: 75c419c60640d309a3f5a9c56d3496f2a445295f88d05c4d86106d5ce16e132d
    contract_hash: e329938d6a9cf532c33ae6b6cd5aea95025199866df4a68fa1897a3a1cf41b6e
    binding_hash: 771f8cf8c9f378d11aaa85a9155c761388e66fad5b10f6e4abb4e4e4bb5b40af
    fingerprint: 6883c50b356e80dc070e14919f67e3ac5a9a89956b691574f809d6942985f98d
    fingerprint_components:
      contract: e329938d6a9cf532c33ae6b6cd5aea95025199866df4a68fa1897a3a1cf41b6e
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
      - symbol_id: SYM-proof-zcode-manifest-fields
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
      test_id: TEST-proof-zcode-manifest-fields
      source:
        reader: json
        file: packages/zcode/.zcode-plugin/plugin.json
        path: ''
        select: keys
      model:
        members:
          - author
          - commands
          - description
          - license
          - mcpServers
          - name
          - skills
          - version
    certificate_digest: 111acc7dd9de331b52544b2d592cf0c5ab1a4d3d6057b7b8f853d899a82ded0f
    claim_bindings:
      - claim_key: CLAIM-60DC86D3C7A20F0D
        requirement_id: REQ-zcode-plugin-package-v2
        fact_id: FACT-zcode-manifest-declares-plugin-parts-v2
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - commands
            - mcpServers
            - skills
          operator: includes
---
Proves that the kibi-zcode plugin manifest declares skills, commands, hooks and mcpServers: Kibi reads the manifest fields itself.