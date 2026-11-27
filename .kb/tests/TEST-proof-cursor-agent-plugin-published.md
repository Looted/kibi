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
    receipt_id: PR-2904084d66242a5fa89b6448
    test_id: TEST-proof-cursor-agent-plugin-published
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
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
