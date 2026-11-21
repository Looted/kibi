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
    receipt_id: PR-d81fb9d9d8012664220eb37d
    test_id: TEST-proof-codex-published-parts
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: b7b99c073f81fd6369d14a7392f6e480f675b8f3715778603b8be7d46ec51dab
    binding_hash: 75e567313a1aaf9288d4be4ed360fac83a5e8d539141f41b36ec19db158d8899
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
        sequence:
          - .codex-plugin
          - .mcp.json
          - hooks
          - skills
          - bin
          - dist
          - CHANGELOG.md
          - LICENSE
          - SECURITY.md
    certificate_digest: 1dd724854272f6989ee1810e3b4e650964a10e3882e4dc6a9b13ddfb63ebe563
    claim_bindings:
      - claim_key: CLAIM-E17040C703A7CF28
        requirement_id: REQ-codex-plugin-package
        fact_id: FACT-codex-package-published-parts
        binding: derived
        scope: source
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