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
    receipt_id: PR-c84145fbbe957dab2aff283e
    test_id: TEST-proof-cursor-agent-plugin-published
    scope: unit
    outcome: passed
    code_snapshot: e54c836d045ddc66e5300f74cfaff528e05df36605bd9587408dc179d35908ca
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:58:11.454Z'
    finished_at: '2026-10-27T07:58:11.613Z'
    artifact_digest: 633623c15955bc1de6b69206d62acfc7ca570562c18aed7b3e894e45134f041b
    contract_hash: 2ebb4160c0d882beef962ea8657282d898936f2be0e65c483d05fedf60838e3b
    binding_hash: 8eb429a87f07d4597765d916c7408461072750d30d557ba76c94969097cdccbd
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
    certificate_digest: cd137406e8dc62780ddc81fc149d33e27648a8295cfc18d316dc4f60b66864d4
    claim_bindings:
      - claim_key: CLAIM-E598B71811986145
        requirement_id: REQ-cursor-agent-plugin-package
        fact_id: FACT-cursor-publishes-agent-plugin
        binding: derived
        scope: code
        obligation:
          kind: set_relation
          members:
            - .cursor-plugin
            - agent-plugin
          operator: includes
---
Reads the files list of packages/cursor/package.json.