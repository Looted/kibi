---
title: 'Source proof: kibi-cursor publishes the Agent Plugin artifact'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:57:06.974Z'
id: TEST-proof-cursor-agent-plugin-published
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-cursor-agent-plugin-published
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/cursor/package.json
    path: /files
    select: items
  proves:
    - CLAIM-E598B71811986145
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c2014128dd4dbd1760d80ef7
    test_id: TEST-proof-cursor-agent-plugin-published
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 2ebb4160c0d882beef962ea8657282d898936f2be0e65c483d05fedf60838e3b
    binding_hash: 0724fc9218c370995ae40506909cccb5c24220cc0e754f5de4a80cb7c33ca33c
    fingerprint: b058fbdc092aeb52683bac781954be5166e7e3803e1d5a9bd8ae6b3c750bc8a9
    fingerprint_components:
      contract: 2ebb4160c0d882beef962ea8657282d898936f2be0e65c483d05fedf60838e3b
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
      - symbol_id: SYM-proof-cursor-agent-plugin-published
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
      test_id: TEST-proof-cursor-agent-plugin-published
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
    certificate_digest: bc0d639c3d9b55a45b7fa3e552cac3383216bd561167328964b84d8acc0a3ae0
    claim_bindings:
      - claim_key: CLAIM-E598B71811986145
        requirement_id: REQ-cursor-agent-plugin-package
        fact_id: FACT-cursor-publishes-agent-plugin
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - .cursor-plugin
            - agent-plugin
          operator: includes
---
Reads the files list of packages/cursor/package.json. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
