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
    receipt_id: PR-a7e62d9657826a247f14943e
    test_id: TEST-proof-codex-published-parts
    scope: unit
    outcome: passed
    code_snapshot: 017f08e44cfd7461b2b4632514b2750261c1be0471722dc4ee28dbea05858af6
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-25T18:11:15.093Z'
    finished_at: '2026-11-25T18:11:15.209Z'
    artifact_digest: 3ec8ed4953a5034ade48b27d425e647361c7744d4180afd3422341dea8cea4af
    contract_hash: b7b99c073f81fd6369d14a7392f6e480f675b8f3715778603b8be7d46ec51dab
    binding_hash: 94930121caf808afbd0db28ee50f5f072884dc68f6e44f583c6a8dd843f62602
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
          - assets
          - bin
          - dist
          - hooks
          - skills
        sequence:
          - .codex-plugin
          - assets
          - .mcp.json
          - hooks
          - skills
          - bin
          - dist
          - CHANGELOG.md
          - LICENSE
          - SECURITY.md
    certificate_digest: d1115970708ac213e2b0a9f2331af3f18f655fb104e5510e509e909c46be4448
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