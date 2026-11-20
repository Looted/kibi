---
title: The kibi-zcode manifest declares its skills, commands, hooks and MCP servers, by a source proof
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
    - CLAIM-2C1636E502EB6164
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-41d799f9fee557cdc214b91f
    test_id: TEST-proof-zcode-manifest-fields
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 50309ab1b9b2fb9f756da05de272826dbc481d73b9a14c56469c2b082ea979c0
    binding_hash: 232486134dc73908a8af982c4e5b9beb64ac22ca1c10ae552cd22c7b2e6a87f6
    fingerprint: 93632abb133fad03878960ecb1cb3d2db9b8b7cbf7bf023709937cde2d856b4f
    fingerprint_components:
      contract: 50309ab1b9b2fb9f756da05de272826dbc481d73b9a14c56469c2b082ea979c0
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
          - hooks
          - license
          - mcpServers
          - name
          - skills
          - version
    certificate_digest: d00d60f6983362039d68c7d7dd331b76b620c9d39844d00e6401e1dd20ba5d4a
    claim_bindings:
      - claim_key: CLAIM-2C1636E502EB6164
        requirement_id: REQ-zcode-plugin-package
        fact_id: FACT-zcode-manifest-declares-plugin-parts
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - commands
            - hooks
            - mcpServers
            - skills
          operator: includes
---
Proves that the kibi-zcode plugin manifest declares skills, commands, hooks and mcpServers: Kibi reads the manifest fields itself.