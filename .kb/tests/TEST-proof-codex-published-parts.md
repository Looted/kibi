---
title: 'Source proof: kibi-codex publishes its plugin parts'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:48:45.873Z'
id: TEST-proof-codex-published-parts
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-codex-published-parts
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/codex/package.json
    path: /files
    select: items
  proves:
    - CLAIM-E17040C703A7CF28
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a8bd1bda14042873949dd2ba
    test_id: TEST-proof-codex-published-parts
    scope: unit
    outcome: passed
    code_snapshot: 328fc65d0a8f68d784d40380e03d82ed697fd6e20aa7eac41f724a6c4fd7718a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:49:36.972Z'
    finished_at: '2026-10-27T07:49:37.165Z'
    artifact_digest: 9de01a8eb88f40d08f7616998d71a3b47ae94fbd804bebbaa76499a83c66bcc6
    contract_hash: b7b99c073f81fd6369d14a7392f6e480f675b8f3715778603b8be7d46ec51dab
    binding_hash: 8e64e706a03419e35de6d9cf6963f519a3c8e4fc52e95f38d38298b069189e0b
    fingerprint: 487d50247390ec4a03357161320d10db8822c7ba58a5b407374986a7915d2667
    fingerprint_components:
      contract: b7b99c073f81fd6369d14a7392f6e480f675b8f3715778603b8be7d46ec51dab
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
      - symbol_id: SYM-proof-codex-published-parts
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
      test_id: TEST-proof-codex-published-parts
      source:
        reader: json
        file: packages/codex/package.json
        path: /files
        select: items
      model:
        members:
          - .codex-plugin
          - .mcp.json
          - CHANGELOG.md
          - LICENSE
          - SECURITY.md
          - bin
          - dist
          - hooks
          - skills
    certificate_digest: ab5d3725802f955d0aba6baa0ea47883bc20499798d45fdd4e44a4ea5e788e4f
    claim_bindings:
      - claim_key: CLAIM-E17040C703A7CF28
        requirement_id: REQ-codex-plugin-package
        fact_id: FACT-codex-package-published-parts
        binding: derived
        scope: code
        obligation:
          kind: set_relation
          members:
            - .codex-plugin
            - .mcp.json
            - bin
            - hooks
            - skills
          operator: includes
---
Reads the files list of packages/codex/package.json and checks it includes every plugin part.